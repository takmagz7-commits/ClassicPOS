const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { getAll, getById, insert, update, remove, query } = require('../db/dbService.cjs');
const { saleToDb, dbToSale } = require('../db/helpers.cjs');
const accountingService = require('../services/accountingService.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { logger } = require('../utils/logger.cjs');

const saleItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discount: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).optional(),
  subtotal: z.number().min(0),
  total: z.number().min(0),
});

const createSaleSchema = z.object({
  id: z.string().min(1, 'Sale ID is required'),
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  total: z.number().min(0, 'Total cannot be negative'),
  amountPaid: z.number().min(0, 'Amount paid cannot be negative'),
  changeDue: z.number(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  status: z.enum(['completed', 'on-hold', 'refunded']).optional(),
  storeId: z.string().optional().or(z.literal('')),
  storeName: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

const updateSaleSchema = createSaleSchema.partial().extend({
  id: z.string().optional(),
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

router.get('/', (req, res) => {
  try {
    const dbSales = getAll('sales');
    const sales = dbSales.map(dbToSale);
    res.json(sales);
  } catch (error) {
    logger.error('Error fetching sales:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch sales' 
    });
  }
});

router.get('/completed', (req, res) => {
  try {
    const dbSales = query(
      'SELECT * FROM sales WHERE status != ? ORDER BY date DESC',
      ['on-hold']
    );
    const sales = dbSales.map(dbToSale);
    res.json(sales);
  } catch (error) {
    logger.error('Error fetching completed sales:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch completed sales' 
    });
  }
});

router.get('/held', (req, res) => {
  try {
    const dbSales = query(
      'SELECT * FROM sales WHERE status = ? ORDER BY date DESC',
      ['on-hold']
    );
    const sales = dbSales.map(dbToSale);
    res.json(sales);
  } catch (error) {
    logger.error('Error fetching held sales:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch held sales' 
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbSale = getById('sales', req.params.id);
    if (!dbSale) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Sale not found' 
      });
    }
    res.json(dbToSale(dbSale));
  } catch (error) {
    logger.error('Error fetching sale:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch sale' 
    });
  }
});

router.post('/', authMiddleware, activityLogger('Sales', 'Create Sale'), validateRequest(createSaleSchema), (req, res) => {
  try {
    const dbSale = saleToDb(req.body);
    insert('sales', dbSale);
    
    if (req.body.status !== 'on-hold') {
      try {
        accountingService.postSaleTransaction(req.body);
      } catch (accountingError) {
        logger.error('Error posting to accounting:', accountingError);
      }
    }
    
    res.status(201).json(req.body);
  } catch (error) {
    logger.error('Error creating sale:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'A sale with this ID already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to create sale' 
    });
  }
});

router.put('/:id', authMiddleware, activityLogger('Sales', 'Update Sale'), validateRequest(updateSaleSchema), (req, res) => {
  try {
    const oldSale = getById('sales', req.params.id);
    
    if (!oldSale) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Sale not found' 
      });
    }
    
    const dbSale = saleToDb(req.body);
    update('sales', req.params.id, dbSale);
    
    if (oldSale && oldSale.status === 'on-hold' && req.body.status !== 'on-hold') {
      try {
        accountingService.postSaleTransaction(req.body);
      } catch (accountingError) {
        logger.error('Error posting to accounting:', accountingError);
      }
    }
    
    res.json(req.body);
  } catch (error) {
    logger.error('Error updating sale:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to update sale' 
    });
  }
});

router.delete('/:id', authMiddleware, activityLogger('Sales', 'Delete Sale'), (req, res) => {
  try {
    const existingSale = getById('sales', req.params.id);
    
    if (!existingSale) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Sale not found' 
      });
    }
    
    remove('sales', req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting sale:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to delete sale' 
    });
  }
});

router.post('/send-receipt', authMiddleware, activityLogger('Sales', 'Send Receipt'), async (req, res) => {
  try {
    const { saleId, customerEmail, receiptData } = req.body;

    if (!customerEmail) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Customer email is required' 
      });
    }

    if (!saleId || !receiptData) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Sale ID and receipt data are required' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Invalid email address' 
      });
    }

    res.json({
      success: true,
      message: `Receipt for sale ${saleId} sent to ${customerEmail}`,
      saleId,
      emailSent: true
    });
  } catch (error) {
    logger.error('Error sending receipt:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to send receipt' 
    });
  }
});

module.exports = router;
