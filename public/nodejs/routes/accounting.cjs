const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/sqlite.cjs');
const {
  chartOfAccountToDb,
  dbToChartOfAccount,
  journalEntryToDb,
  dbToJournalEntry,
  journalEntryLineToDb,
  dbToJournalEntryLine,
  bankAccountToDb,
  dbToBankAccount,
} = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { logger } = require('../utils/logger.cjs');

router.get('/accounts', async (req, res) => {
  try {
    const db = getDatabase();
    const accounts = db.prepare('SELECT * FROM chart_of_accounts WHERE is_active = 1 ORDER BY account_code').all();
    res.json(accounts.map(dbToChartOfAccount));
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.post('/accounts', authMiddleware, activityLogger('Accounting', 'Create Account'), async (req, res) => {
  try {
    const db = getDatabase();
    const dbAccount = chartOfAccountToDb(req.body);
    
    const stmt = db.prepare(`
      INSERT INTO chart_of_accounts (
        id, account_code, account_name, account_type, account_category,
        parent_account_id, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      dbAccount.id,
      dbAccount.account_code,
      dbAccount.account_name,
      dbAccount.account_type,
      dbAccount.account_category,
      dbAccount.parent_account_id,
      dbAccount.description,
      dbAccount.is_active
    );
    
    res.json(req.body);
  } catch (error) {
    logger.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.put('/accounts/:id', authMiddleware, activityLogger('Accounting', 'Update Account'), async (req, res) => {
  try {
    const db = getDatabase();
    const dbAccount = chartOfAccountToDb(req.body);
    
    const stmt = db.prepare(`
      UPDATE chart_of_accounts 
      SET account_code = ?, account_name = ?, account_type = ?, 
          account_category = ?, parent_account_id = ?, description = ?, is_active = ?
      WHERE id = ?
    `);
    
    stmt.run(
      dbAccount.account_code,
      dbAccount.account_name,
      dbAccount.account_type,
      dbAccount.account_category,
      dbAccount.parent_account_id,
      dbAccount.description,
      dbAccount.is_active,
      req.params.id
    );
    
    res.json(req.body);
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', authMiddleware, activityLogger('Accounting', 'Delete Account'), async (req, res) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE chart_of_accounts SET is_active = 0 WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.get('/journal-entries', async (req, res) => {
  try {
    const db = getDatabase();
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND entry_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND entry_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY entry_date DESC, entry_number DESC';
    
    const entries = db.prepare(query).all(...params);
    
    const entriesWithLines = entries.map(entry => {
      const journalEntry = dbToJournalEntry(entry);
      const lines = db.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').all(entry.id);
      journalEntry.lines = lines.map(dbToJournalEntryLine);
      return journalEntry;
    });
    
    res.json(entriesWithLines);
  } catch (error) {
    logger.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

router.post('/journal-entries', authMiddleware, activityLogger('Accounting', 'Create Journal Entry'), async (req, res) => {
  try {
    const db = getDatabase();
    const { lines, ...entryData } = req.body;
    
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Debits must equal credits' });
    }
    
    db.exec('BEGIN TRANSACTION');
    
    try {
      const dbEntry = journalEntryToDb(entryData);
      
      const entryStmt = db.prepare(`
        INSERT INTO journal_entries (
          id, entry_date, entry_number, reference_type, reference_id,
          description, posted_by_user_id, posted_by_user_name, is_posted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      entryStmt.run(
        dbEntry.id,
        dbEntry.entry_date,
        dbEntry.entry_number,
        dbEntry.reference_type,
        dbEntry.reference_id,
        dbEntry.description,
        dbEntry.posted_by_user_id,
        dbEntry.posted_by_user_name,
        dbEntry.is_posted
      );
      
      const lineStmt = db.prepare(`
        INSERT INTO journal_entry_lines (
          id, journal_entry_id, account_id, account_code, account_name,
          debit, credit, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const line of lines) {
        const dbLine = journalEntryLineToDb({ ...line, journalEntryId: dbEntry.id });
        lineStmt.run(
          dbLine.id,
          dbLine.journal_entry_id,
          dbLine.account_id,
          dbLine.account_code,
          dbLine.account_name,
          dbLine.debit,
          dbLine.credit,
          dbLine.description
        );
      }
      
      db.exec('COMMIT');
      
      res.json({ ...req.body, lines });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.get('/ledger', async (req, res) => {
  try {
    const db = getDatabase();
    const { accountId, startDate, endDate } = req.query;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    let query = `
      SELECT 
        je.entry_date as date,
        je.entry_number,
        je.description,
        je.reference_type,
        je.reference_id,
        jel.debit,
        jel.credit
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = ?
    `;
    
    const params = [accountId];
    
    if (startDate) {
      query += ' AND je.entry_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND je.entry_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY je.entry_date, je.entry_number';
    
    const entries = db.prepare(query).all(...params);
    
    let balance = 0;
    const ledgerEntries = entries.map(entry => {
      balance += entry.debit - entry.credit;
      return {
        date: entry.date,
        entryNumber: entry.entry_number,
        description: entry.description,
        referenceType: entry.reference_type || undefined,
        referenceId: entry.reference_id || undefined,
        debit: entry.debit,
        credit: entry.credit,
        balance,
      };
    });
    
    res.json(ledgerEntries);
  } catch (error) {
    logger.error('Error fetching ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

router.get('/trial-balance', async (req, res) => {
  try {
    const db = getDatabase();
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        SUM(jel.debit) as total_debit,
        SUM(jel.credit) as total_credit
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = 1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND (je.entry_date IS NULL OR je.entry_date >= ?)';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND (je.entry_date IS NULL OR je.entry_date <= ?)';
      params.push(endDate);
    }
    
    query += ' GROUP BY coa.id ORDER BY coa.account_code';
    
    const results = db.prepare(query).all(...params);
    
    const trialBalance = results.map(row => ({
      accountCode: row.account_code,
      accountName: row.account_name,
      accountType: row.account_type,
      debit: row.total_debit || 0,
      credit: row.total_credit || 0,
      balance: (row.total_debit || 0) - (row.total_credit || 0),
    })).filter(row => row.debit !== 0 || row.credit !== 0);
    
    res.json(trialBalance);
  } catch (error) {
    logger.error('Error fetching trial balance:', error);
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

router.get('/income-statement', async (req, res) => {
  try {
    const db = getDatabase();
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const query = `
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_category,
        SUM(jel.credit - jel.debit) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = 1
        AND coa.account_type IN ('income', 'expense')
        AND je.entry_date >= ?
        AND je.entry_date <= ?
      GROUP BY coa.id
      ORDER BY coa.account_type DESC, coa.account_code
    `;
    
    const results = db.prepare(query).all(startDate, endDate);
    
    const incomeStatement = results.map(row => ({
      accountCode: row.account_code,
      accountName: row.account_name,
      accountCategory: row.account_category,
      amount: row.amount || 0,
    }));
    
    res.json(incomeStatement);
  } catch (error) {
    logger.error('Error fetching income statement:', error);
    res.status(500).json({ error: 'Failed to fetch income statement' });
  }
});

router.get('/balance-sheet', async (req, res) => {
  try {
    const db = getDatabase();
    const { asOfDate } = req.query;
    
    if (!asOfDate) {
      return res.status(400).json({ error: 'As of date is required' });
    }
    
    const query = `
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_category,
        SUM(jel.debit - jel.credit) as amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = 1
        AND coa.account_type IN ('asset', 'liability', 'equity')
        AND (je.entry_date IS NULL OR je.entry_date <= ?)
      GROUP BY coa.id
      ORDER BY coa.account_type, coa.account_code
    `;
    
    const results = db.prepare(query).all(asOfDate);
    
    const balanceSheet = results.map(row => ({
      accountCode: row.account_code,
      accountName: row.account_name,
      accountCategory: row.account_category,
      amount: row.amount || 0,
    }));
    
    res.json(balanceSheet);
  } catch (error) {
    logger.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet' });
  }
});

router.get('/cash-flow', async (req, res) => {
  try {
    const db = getDatabase();
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const query = `
      SELECT 
        je.entry_date as date,
        je.description,
        jel.debit - jel.credit as amount,
        CASE 
          WHEN je.reference_type = 'sale' THEN 'operating'
          WHEN je.reference_type = 'purchase' THEN 'operating'
          WHEN je.reference_type = 'payment' THEN 'operating'
          ELSE 'financing'
        END as category
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_name LIKE '%Cash%' OR coa.account_name LIKE '%Bank%'
        AND je.entry_date >= ?
        AND je.entry_date <= ?
      ORDER BY je.entry_date
    `;
    
    const results = db.prepare(query).all(startDate, endDate);
    
    const cashFlow = results.map(row => ({
      description: row.description,
      category: row.category,
      amount: row.amount || 0,
      date: row.date,
    }));
    
    res.json(cashFlow);
  } catch (error) {
    logger.error('Error fetching cash flow:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow' });
  }
});

router.get('/accounts-receivable', async (req, res) => {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        s.id as invoice_number,
        s.date as invoice_date,
        s.customer_id,
        s.customer_name as name,
        s.total as total_amount,
        COALESCE(payments.paid, 0) as paid_amount,
        s.total - COALESCE(payments.paid, 0) as balance,
        CAST(julianday('now') - julianday(s.date) AS INTEGER) as aging_days
      FROM sales s
      LEFT JOIN (
        SELECT 
          reference_id,
          SUM(debit) as paid
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.reference_type = 'payment'
        GROUP BY reference_id
      ) payments ON s.id = payments.reference_id
      WHERE s.type = 'sale'
        AND s.payment_method_id IN (SELECT id FROM payment_methods WHERE is_credit = 1)
        AND s.total - COALESCE(payments.paid, 0) > 0
      ORDER BY s.date DESC
    `;
    
    const results = db.prepare(query).all();
    
    const receivables = results.map(row => ({
      customerId: row.customer_id || undefined,
      name: row.name || 'Unknown',
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      dueDate: row.invoice_date,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      balance: row.balance,
      agingDays: row.aging_days,
    }));
    
    res.json(receivables);
  } catch (error) {
    logger.error('Error fetching accounts receivable:', error);
    res.status(500).json({ error: 'Failed to fetch accounts receivable' });
  }
});

router.get('/accounts-payable', async (req, res) => {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        po.id as invoice_number,
        po.order_date as invoice_date,
        po.supplier_id,
        po.supplier_name as name,
        po.total_value as total_amount,
        COALESCE(payments.paid, 0) as paid_amount,
        po.total_value - COALESCE(payments.paid, 0) as balance,
        CAST(julianday('now') - julianday(po.order_date) AS INTEGER) as aging_days
      FROM purchase_orders po
      LEFT JOIN (
        SELECT 
          reference_id,
          SUM(credit) as paid
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE je.reference_type = 'supplier_payment'
        GROUP BY reference_id
      ) payments ON po.id = payments.reference_id
      WHERE po.total_value - COALESCE(payments.paid, 0) > 0
      ORDER BY po.order_date DESC
    `;
    
    const results = db.prepare(query).all();
    
    const payables = results.map(row => ({
      supplierId: row.supplier_id || undefined,
      name: row.name || 'Unknown',
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      dueDate: row.invoice_date,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      balance: row.balance,
      agingDays: row.aging_days,
    }));
    
    res.json(payables);
  } catch (error) {
    logger.error('Error fetching accounts payable:', error);
    res.status(500).json({ error: 'Failed to fetch accounts payable' });
  }
});

router.get('/bank-accounts', async (req, res) => {
  try {
    const db = getDatabase();
    const accounts = db.prepare('SELECT * FROM bank_accounts WHERE is_active = 1').all();
    res.json(accounts.map(dbToBankAccount));
  } catch (error) {
    logger.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

router.post('/bank-accounts', authMiddleware, activityLogger('Accounting', 'Create Bank Account'), async (req, res) => {
  try {
    const db = getDatabase();
    const dbAccount = bankAccountToDb(req.body);
    
    const stmt = db.prepare(`
      INSERT INTO bank_accounts (
        id, account_name, bank_name, account_number, account_type,
        opening_balance, current_balance, currency_code, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      dbAccount.id,
      dbAccount.account_name,
      dbAccount.bank_name,
      dbAccount.account_number,
      dbAccount.account_type,
      dbAccount.opening_balance,
      dbAccount.current_balance,
      dbAccount.currency_code,
      dbAccount.is_active,
      dbAccount.notes
    );
    
    res.json(req.body);
  } catch (error) {
    logger.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

module.exports = router;
