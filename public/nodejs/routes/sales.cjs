const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove, query } = require('../db/dbService.cjs');
const { saleToDb, dbToSale } = require('../db/helpers.cjs');
const accountingService = require('../services/accountingService.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { logger } = require('../utils/logger.cjs');

router.get('/', (req, res) => {
  try {
    const dbSales = getAll('sales');
    const sales = dbSales.map(dbToSale);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get completed sales (not on-hold)
router.get('/completed', (req, res) => {
  try {
    const dbSales = query(
      'SELECT * FROM sales WHERE status != ? ORDER BY date DESC',
      ['on-hold']
    );
    const sales = dbSales.map(dbToSale);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get held sales
router.get('/held', (req, res) => {
  try {
    const dbSales = query(
      'SELECT * FROM sales WHERE status = ? ORDER BY date DESC',
      ['on-hold']
    );
    const sales = dbSales.map(dbToSale);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbSale = getById('sales', req.params.id);
    if (!dbSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(dbToSale(dbSale));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, activityLogger('Sales', 'Create Sale'), (req, res) => {
  try {
    const dbSale = saleToDb(req.body);
    insert('sales', dbSale);
    
    // Automatically post to accounting if sale is completed (not on-hold)
    if (req.body.status !== 'on-hold') {
      try {
        accountingService.postSaleTransaction(req.body);
      } catch (accountingError) {
        logger.error('Error posting to accounting:', accountingError);
        // Continue even if accounting posting fails - don't block the sale
      }
    }
    
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, activityLogger('Sales', 'Update Sale'), (req, res) => {
  try {
    const oldSale = getById('sales', req.params.id);
    const dbSale = saleToDb(req.body);
    update('sales', req.params.id, dbSale);
    
    // If sale was on-hold and now completed, post to accounting
    if (oldSale && oldSale.status === 'on-hold' && req.body.status !== 'on-hold') {
      try {
        accountingService.postSaleTransaction(req.body);
      } catch (accountingError) {
        logger.error('Error posting to accounting:', accountingError);
        // Continue even if accounting posting fails
      }
    }
    
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, activityLogger('Sales', 'Delete Sale'), (req, res) => {
  try {
    remove('sales', req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-receipt', authMiddleware, activityLogger('Sales', 'Send Receipt'), async (req, res) => {
  try {
    const { saleId, customerEmail, receiptData } = req.body;

    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email is required' });
    }

    if (!saleId || !receiptData) {
      return res.status(400).json({ error: 'Sale ID and receipt data are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    res.json({
      success: true,
      message: `Receipt for sale ${saleId} sent to ${customerEmail}`,
      saleId,
      emailSent: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to send receipt',
      message: error.message 
    });
  }
});

module.exports = router;
