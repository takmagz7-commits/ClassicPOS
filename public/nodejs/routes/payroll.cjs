const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAll, getById, insert, update, query, queryOne } = require('../db/dbService.cjs');
const { payrollToDb, dbToPayroll } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { z } = require('zod');

const createPayrollSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  baseSalary: z.number().min(0),
  totalAllowances: z.number().min(0).default(0),
  totalDeductions: z.number().min(0).default(0),
  overtimeAmount: z.number().min(0).default(0),
  periodStart: z.string(),
  periodEnd: z.string(),
});

const updatePayrollSchema = z.object({
  baseSalary: z.number().min(0).optional(),
  totalAllowances: z.number().min(0).optional(),
  totalDeductions: z.number().min(0).optional(),
  overtimeAmount: z.number().min(0).optional(),
  status: z.enum(['pending', 'approved', 'paid', 'cancelled']).optional(),
});

const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Validation error', details: error.errors });
  }
};

router.get('/', authMiddleware, (req, res) => {
  try {
    const { userId, status, startDate, endDate } = req.query;
    
    let sqlQuery = 'SELECT * FROM payroll';
    const params = [];
    const conditions = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (startDate) {
      conditions.push('period_start >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('period_end <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }

    sqlQuery += ' ORDER BY created_at DESC';

    const dbPayrolls = query(sqlQuery, params);
    const payrolls = dbPayrolls.map(dbToPayroll);
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const dbPayroll = getById('payroll', req.params.id);
    if (!dbPayroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    res.json(dbToPayroll(dbPayroll));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, activityLogger('payroll'), validateRequest(createPayrollSchema), async (req, res) => {
  try {
    const {
      userId,
      userName,
      baseSalary,
      totalAllowances,
      totalDeductions,
      overtimeAmount,
      periodStart,
      periodEnd,
    } = req.body;

    const existingPayroll = queryOne(
      'SELECT * FROM payroll WHERE user_id = ? AND period_start = ? AND period_end = ?',
      [userId, periodStart, periodEnd]
    );

    if (existingPayroll) {
      return res.status(400).json({
        error: 'Payroll exists',
        message: 'Payroll record already exists for this user and period'
      });
    }

    const netSalary = baseSalary + totalAllowances + overtimeAmount - totalDeductions;

    const newPayroll = {
      id: crypto.randomUUID(),
      userId,
      userName,
      baseSalary,
      totalAllowances,
      totalDeductions,
      overtimeAmount,
      netSalary: parseFloat(netSalary.toFixed(2)),
      periodStart,
      periodEnd,
      status: 'pending',
    };

    const dbPayroll = payrollToDb(newPayroll);
    insert('payroll', dbPayroll);

    res.status(201).json(newPayroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, activityLogger('payroll'), validateRequest(updatePayrollSchema), (req, res) => {
  try {
    const { id } = req.params;
    const {
      baseSalary,
      totalAllowances,
      totalDeductions,
      overtimeAmount,
      status,
    } = req.body;

    const dbPayroll = getById('payroll', id);
    if (!dbPayroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    const updatedData = {};
    
    if (baseSalary !== undefined) updatedData.base_salary = baseSalary;
    if (totalAllowances !== undefined) updatedData.total_allowances = totalAllowances;
    if (totalDeductions !== undefined) updatedData.total_deductions = totalDeductions;
    if (overtimeAmount !== undefined) updatedData.overtime_amount = overtimeAmount;
    if (status !== undefined) updatedData.status = status;

    const finalBaseSalary = baseSalary !== undefined ? baseSalary : dbPayroll.base_salary;
    const finalAllowances = totalAllowances !== undefined ? totalAllowances : dbPayroll.total_allowances;
    const finalDeductions = totalDeductions !== undefined ? totalDeductions : dbPayroll.total_deductions;
    const finalOvertime = overtimeAmount !== undefined ? overtimeAmount : dbPayroll.overtime_amount;

    const netSalary = finalBaseSalary + finalAllowances + finalOvertime - finalDeductions;
    updatedData.net_salary = parseFloat(netSalary.toFixed(2));

    update('payroll', id, updatedData);

    const updatedPayroll = dbToPayroll({ ...dbPayroll, ...updatedData });
    res.json(updatedPayroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, activityLogger('payroll'), (req, res) => {
  try {
    const { id } = req.params;

    const dbPayroll = getById('payroll', id);
    if (!dbPayroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    if (dbPayroll.status === 'paid') {
      return res.status(400).json({
        error: 'Cannot delete',
        message: 'Cannot delete a paid payroll record'
      });
    }

    const { remove } = require('../db/dbService.cjs');
    remove('payroll', id);

    res.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/approve', authMiddleware, activityLogger('payroll', 'Approve'), async (req, res) => {
  try {
    const { id } = req.params;

    const dbPayroll = getById('payroll', id);
    if (!dbPayroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    if (dbPayroll.status === 'paid') {
      return res.status(400).json({
        error: 'Already paid',
        message: 'This payroll has already been paid'
      });
    }

    update('payroll', id, { status: 'approved' });

    const updatedPayroll = dbToPayroll({ ...dbPayroll, status: 'approved' });
    res.json(updatedPayroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/pay', authMiddleware, activityLogger('payroll', 'Pay'), async (req, res) => {
  try {
    const { id } = req.params;
    const { createJournalEntry } = req.body;

    const dbPayroll = getById('payroll', id);
    if (!dbPayroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    if (dbPayroll.status === 'paid') {
      return res.status(400).json({
        error: 'Already paid',
        message: 'This payroll has already been paid'
      });
    }

    let journalEntryId = null;

    if (createJournalEntry) {
      const salaryExpenseAccount = queryOne(
        "SELECT * FROM chart_of_accounts WHERE account_name LIKE '%Salary%' OR account_name LIKE '%Payroll%' LIMIT 1"
      );
      
      const cashAccount = queryOne(
        "SELECT * FROM chart_of_accounts WHERE account_name LIKE '%Cash%' OR account_type = 'asset' LIMIT 1"
      );

      if (salaryExpenseAccount && cashAccount) {
        journalEntryId = crypto.randomUUID();
        const entryNumber = `PAY-${Date.now()}`;

        const journalEntry = {
          id: journalEntryId,
          entry_date: new Date().toISOString().split('T')[0],
          entry_number: entryNumber,
          reference_type: 'payroll',
          reference_id: id,
          description: `Payroll payment for ${dbPayroll.user_name} (${dbPayroll.period_start} to ${dbPayroll.period_end})`,
          posted_by_user_id: req.user.id,
          posted_by_user_name: req.user.email,
          is_posted: 1,
        };

        insert('journal_entries', journalEntry);

        const debitLine = {
          id: crypto.randomUUID(),
          journal_entry_id: journalEntryId,
          account_id: salaryExpenseAccount.id,
          account_code: salaryExpenseAccount.account_code,
          account_name: salaryExpenseAccount.account_name,
          debit: dbPayroll.net_salary,
          credit: 0,
          description: `Salary expense for ${dbPayroll.user_name}`,
        };

        const creditLine = {
          id: crypto.randomUUID(),
          journal_entry_id: journalEntryId,
          account_id: cashAccount.id,
          account_code: cashAccount.account_code,
          account_name: cashAccount.account_name,
          debit: 0,
          credit: dbPayroll.net_salary,
          description: `Cash payment for ${dbPayroll.user_name}`,
        };

        insert('journal_entry_lines', debitLine);
        insert('journal_entry_lines', creditLine);
      }
    }

    const updatedData = {
      status: 'paid',
      journal_entry_id: journalEntryId,
    };

    update('payroll', id, updatedData);

    const updatedPayroll = dbToPayroll({ ...dbPayroll, ...updatedData });
    res.json(updatedPayroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/calculate', authMiddleware, activityLogger('payroll', 'Calculate'), async (req, res) => {
  try {
    const { userId, periodStart, periodEnd } = req.body;

    if (!userId || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'userId, periodStart, and periodEnd are required'
      });
    }

    const user = getById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const attendances = query(
      'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ?',
      [userId, periodStart, periodEnd]
    );

    const totalHours = attendances.reduce((sum, att) => sum + (att.total_hours || 0), 0);
    const baseSalary = user.salary || 0;
    
    const standardHours = 160;
    let overtimeAmount = 0;
    if (totalHours > standardHours) {
      const overtimeHours = totalHours - standardHours;
      const hourlyRate = baseSalary / standardHours;
      overtimeAmount = overtimeHours * hourlyRate * 1.5;
    }

    const calculation = {
      userId: user.id,
      userName: user.full_name || user.email,
      baseSalary,
      totalAllowances: 0,
      totalDeductions: 0,
      overtimeAmount: parseFloat(overtimeAmount.toFixed(2)),
      totalHours,
      periodStart,
      periodEnd,
      netSalary: parseFloat((baseSalary + overtimeAmount).toFixed(2)),
    };

    res.json(calculation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
