const { getDatabase } = require('../db/sqlite.cjs');
const { randomUUID } = require('crypto');
const { logger } = require('../utils/logger.cjs');

const seedDefaultChartOfAccounts = () => {
  const db = getDatabase();
  
  const existingAccounts = db.prepare('SELECT COUNT(*) as count FROM chart_of_accounts').get();
  
  if (existingAccounts.count > 0) {
    return;
  }
  
  const defaultAccounts = [
    { code: '1000', name: 'Cash', type: 'asset', category: 'current_asset' },
    { code: '1010', name: 'Bank Account', type: 'asset', category: 'current_asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
    { code: '1200', name: 'Inventory', type: 'asset', category: 'current_asset' },
    { code: '1500', name: 'Equipment', type: 'asset', category: 'fixed_asset' },
    { code: '1600', name: 'Accumulated Depreciation', type: 'asset', category: 'fixed_asset' },
    
    { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability' },
    { code: '2100', name: 'Sales Tax Payable', type: 'liability', category: 'current_liability' },
    { code: '2200', name: 'Unearned Revenue', type: 'liability', category: 'current_liability' },
    { code: '2500', name: 'Long-term Debt', type: 'liability', category: 'long_term_liability' },
    
    { code: '3000', name: 'Owner\'s Equity', type: 'equity', category: 'equity' },
    { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'equity' },
    
    { code: '4000', name: 'Sales Revenue', type: 'income', category: 'revenue' },
    { code: '4100', name: 'Service Revenue', type: 'income', category: 'revenue' },
    { code: '4900', name: 'Other Income', type: 'income', category: 'other_income' },
    
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_goods_sold' },
    { code: '6000', name: 'Salaries Expense', type: 'expense', category: 'operating_expense' },
    { code: '6100', name: 'Rent Expense', type: 'expense', category: 'operating_expense' },
    { code: '6200', name: 'Utilities Expense', type: 'expense', category: 'operating_expense' },
    { code: '6300', name: 'Supplies Expense', type: 'expense', category: 'operating_expense' },
    { code: '6400', name: 'Advertising Expense', type: 'expense', category: 'operating_expense' },
    { code: '6500', name: 'Depreciation Expense', type: 'expense', category: 'operating_expense' },
    { code: '6600', name: 'Insurance Expense', type: 'expense', category: 'operating_expense' },
    { code: '6700', name: 'Discount Expense', type: 'expense', category: 'operating_expense' },
    { code: '6800', name: 'Inventory Loss', type: 'expense', category: 'operating_expense' },
    { code: '7000', name: 'Interest Expense', type: 'expense', category: 'other_expense' },
  ];
  
  const stmt = db.prepare(`
    INSERT INTO chart_of_accounts (
      id, account_code, account_name, account_type, account_category, is_active
    ) VALUES (?, ?, ?, ?, ?, 1)
  `);
  
  for (const account of defaultAccounts) {
    stmt.run(randomUUID(), account.code, account.name, account.type, account.category);
  }
  
  logger.info('✅ Default chart of accounts seeded');
};

const getAccountByCode = (accountCode) => {
  const db = getDatabase();
  return db.prepare('SELECT * FROM chart_of_accounts WHERE account_code = ?').get(accountCode);
};

const getNextJournalEntryNumber = () => {
  const db = getDatabase();
  const result = db.prepare('SELECT MAX(CAST(entry_number AS INTEGER)) as max_num FROM journal_entries WHERE entry_number GLOB \'[0-9]*\'').get();
  const nextNum = (result.max_num || 0) + 1;
  return nextNum.toString().padStart(6, '0');
};

const createJournalEntry = (entryData, lines) => {
  const db = getDatabase();
  
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry must balance. Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }
  
  db.exec('BEGIN TRANSACTION');
  
  try {
    const entryId = randomUUID();
    const entryNumber = getNextJournalEntryNumber();
    
    db.prepare(`
      INSERT INTO journal_entries (
        id, entry_date, entry_number, reference_type, reference_id,
        description, posted_by_user_id, posted_by_user_name, is_posted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      entryId,
      entryData.entryDate,
      entryNumber,
      entryData.referenceType || null,
      entryData.referenceId || null,
      entryData.description,
      entryData.postedByUserId || null,
      entryData.postedByUserName || null
    );
    
    const lineStmt = db.prepare(`
      INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, account_code, account_name,
        debit, credit, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const line of lines) {
      const account = db.prepare('SELECT * FROM chart_of_accounts WHERE id = ?').get(line.accountId);
      if (!account) {
        throw new Error(`Account with ID ${line.accountId} not found`);
      }
      
      lineStmt.run(
        randomUUID(),
        entryId,
        line.accountId,
        account.account_code,
        account.account_name,
        line.debit || 0,
        line.credit || 0,
        line.description || null
      );
    }
    
    db.exec('COMMIT');
    return { entryId, entryNumber };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const postSaleTransaction = (sale) => {
  const db = getDatabase();
  
  const cashAccount = getAccountByCode('1000');
  const bankAccount = getAccountByCode('1010');
  const receivableAccount = getAccountByCode('1100');
  const revenueAccount = getAccountByCode('4000');
  const taxPayableAccount = getAccountByCode('2100');
  const cogsAccount = getAccountByCode('5000');
  const inventoryAccount = getAccountByCode('1200');
  const discountExpenseAccount = getAccountByCode('6700');
  
  if (!cashAccount || !receivableAccount || !revenueAccount || !taxPayableAccount || !cogsAccount || !inventoryAccount) {
    logger.warn('Required accounts not found for sale posting. Skipping.');
    return;
  }
  
  const paymentMethod = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(sale.paymentMethodId);
  const isCredit = paymentMethod?.is_credit === 1;
  const isCash = paymentMethod?.is_cash_equivalent === 1;
  
  const debitAccount = isCredit ? receivableAccount : (isCash ? cashAccount : bankAccount);
  
  const lines = [];
  
  lines.push({
    accountId: debitAccount.id,
    debit: sale.total,
    credit: 0,
    description: `Sale to ${sale.customerName || 'Walk-in Customer'}`
  });
  
  lines.push({
    accountId: revenueAccount.id,
    debit: 0,
    credit: sale.subtotal,
    description: 'Sales revenue'
  });
  
  if (sale.tax > 0) {
    lines.push({
      accountId: taxPayableAccount.id,
      debit: 0,
      credit: sale.tax,
      description: 'Sales tax collected'
    });
  }
  
  if (sale.discountAmount && sale.discountAmount > 0 && discountExpenseAccount) {
    lines.push({
      accountId: discountExpenseAccount.id,
      debit: sale.discountAmount,
      credit: 0,
      description: 'Discount given'
    });
  }
  
  if (sale.loyaltyPointsDiscountAmount && sale.loyaltyPointsDiscountAmount > 0 && discountExpenseAccount) {
    lines.push({
      accountId: discountExpenseAccount.id,
      debit: sale.loyaltyPointsDiscountAmount,
      credit: 0,
      description: 'Loyalty points redeemed'
    });
  }
  
  try {
    createJournalEntry({
      entryDate: sale.date,
      referenceType: 'sale',
      referenceId: sale.id,
      description: `Sale ${sale.id}`,
      postedByUserId: sale.employeeId,
      postedByUserName: sale.employeeName
    }, lines);
    
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    const totalCost = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    
    if (totalCost > 0) {
      createJournalEntry({
        entryDate: sale.date,
        referenceType: 'sale_cogs',
        referenceId: sale.id,
        description: `COGS for Sale ${sale.id}`
      }, [
        {
          accountId: cogsAccount.id,
          debit: totalCost,
          credit: 0,
          description: 'Cost of goods sold'
        },
        {
          accountId: inventoryAccount.id,
          debit: 0,
          credit: totalCost,
          description: 'Inventory reduction'
        }
      ]);
    }
  } catch (error) {
    logger.error('Error posting sale transaction:', error);
  }
};

const postRefundTransaction = (refund) => {
  const db = getDatabase();
  
  const cashAccount = getAccountByCode('1000');
  const bankAccount = getAccountByCode('1010');
  const receivableAccount = getAccountByCode('1100');
  const revenueAccount = getAccountByCode('4000');
  const taxPayableAccount = getAccountByCode('2100');
  const cogsAccount = getAccountByCode('5000');
  const inventoryAccount = getAccountByCode('1200');
  
  if (!cashAccount || !receivableAccount || !revenueAccount || !taxPayableAccount || !cogsAccount || !inventoryAccount) {
    logger.warn('Required accounts not found for refund posting. Skipping.');
    return;
  }
  
  const paymentMethod = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(refund.paymentMethodId);
  const isCredit = paymentMethod?.is_credit === 1;
  const isCash = paymentMethod?.is_cash_equivalent === 1;
  
  const creditAccount = isCredit ? receivableAccount : (isCash ? cashAccount : bankAccount);
  
  const lines = [
    {
      accountId: revenueAccount.id,
      debit: Math.abs(refund.subtotal),
      credit: 0,
      description: 'Sales revenue refund'
    },
    {
      accountId: creditAccount.id,
      debit: 0,
      credit: Math.abs(refund.total),
      description: `Refund to ${refund.customerName || 'Customer'}`
    }
  ];
  
  if (refund.tax > 0) {
    lines.push({
      accountId: taxPayableAccount.id,
      debit: Math.abs(refund.tax),
      credit: 0,
      description: 'Sales tax refund'
    });
  }
  
  try {
    createJournalEntry({
      entryDate: refund.date,
      referenceType: 'refund',
      referenceId: refund.id,
      description: `Refund ${refund.id}`
    }, lines);
    
    const items = typeof refund.items === 'string' ? JSON.parse(refund.items) : refund.items;
    const totalCost = Math.abs(items.reduce((sum, item) => sum + (item.cost * item.quantity), 0));
    
    if (totalCost > 0) {
      createJournalEntry({
        entryDate: refund.date,
        referenceType: 'refund_cogs',
        referenceId: refund.id,
        description: `COGS reversal for Refund ${refund.id}`
      }, [
        {
          accountId: inventoryAccount.id,
          debit: totalCost,
          credit: 0,
          description: 'Inventory return'
        },
        {
          accountId: cogsAccount.id,
          debit: 0,
          credit: totalCost,
          description: 'COGS reversal'
        }
      ]);
    }
  } catch (error) {
    logger.error('Error posting refund transaction:', error);
  }
};

const postPurchaseTransaction = (purchaseOrder) => {
  const db = getDatabase();
  
  const inventoryAccount = getAccountByCode('1200');
  const payableAccount = getAccountByCode('2000');
  
  if (!inventoryAccount || !payableAccount) {
    logger.warn('Required accounts not found for purchase posting. Skipping.');
    return;
  }
  
  const lines = [
    {
      accountId: inventoryAccount.id,
      debit: purchaseOrder.total_value,
      credit: 0,
      description: `Purchase from ${purchaseOrder.supplier_name}`
    },
    {
      accountId: payableAccount.id,
      debit: 0,
      credit: purchaseOrder.total_value,
      description: `Payable to ${purchaseOrder.supplier_name}`
    }
  ];
  
  try {
    createJournalEntry({
      entryDate: purchaseOrder.order_date,
      referenceType: 'purchase',
      referenceId: purchaseOrder.id,
      description: `Purchase Order ${purchaseOrder.reference_no}`
    }, lines);
  } catch (error) {
    logger.error('Error posting purchase transaction:', error);
  }
};

const postStockAdjustment = (adjustment) => {
  const db = getDatabase();
  
  const inventoryAccount = getAccountByCode('1200');
  const lossAccount = getAccountByCode('6800');
  
  if (!inventoryAccount || !lossAccount) {
    logger.warn('Required accounts not found for stock adjustment posting. Skipping.');
    return;
  }
  
  const items = typeof adjustment.items === 'string' ? JSON.parse(adjustment.items) : adjustment.items;
  const totalAdjustment = items.reduce((sum, item) => {
    const product = db.prepare('SELECT cost FROM products WHERE id = ?').get(item.productId);
    return sum + ((product?.cost || 0) * item.adjustmentQuantity);
  }, 0);
  
  if (totalAdjustment === 0) return;
  
  const lines = totalAdjustment > 0 ? [
    {
      accountId: inventoryAccount.id,
      debit: Math.abs(totalAdjustment),
      credit: 0,
      description: 'Inventory increase'
    },
    {
      accountId: lossAccount.id,
      debit: 0,
      credit: Math.abs(totalAdjustment),
      description: 'Inventory adjustment'
    }
  ] : [
    {
      accountId: lossAccount.id,
      debit: Math.abs(totalAdjustment),
      credit: 0,
      description: 'Inventory loss'
    },
    {
      accountId: inventoryAccount.id,
      debit: 0,
      credit: Math.abs(totalAdjustment),
      description: 'Inventory decrease'
    }
  ];
  
  try {
    createJournalEntry({
      entryDate: adjustment.adjustment_date,
      referenceType: 'stock_adjustment',
      referenceId: adjustment.id,
      description: `Stock Adjustment - ${adjustment.store_name}`
    }, lines);
  } catch (error) {
    logger.error('Error posting stock adjustment:', error);
  }
};

module.exports = {
  seedDefaultChartOfAccounts,
  createJournalEntry,
  postSaleTransaction,
  postRefundTransaction,
  postPurchaseTransaction,
  postStockAdjustment,
  getAccountByCode,
  getNextJournalEntryNumber
};
