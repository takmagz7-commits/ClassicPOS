const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { getAll, getById, insert, update, remove, query, queryOne } = require('../db/dbService.cjs');
const { customerToDb, dbToCustomer } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { logger } = require('../utils/logger.cjs');

const createCustomerSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(100, 'Customer name must be less than 100 characters'),
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional().or(z.literal('')),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
  loyaltyPoints: z.number().int('Loyalty points must be an integer').min(0, 'Loyalty points cannot be negative').default(0),
  vatNumber: z.string().max(50, 'VAT number must be less than 50 characters').optional().or(z.literal('')),
  tinNumber: z.string().max(50, 'TIN number must be less than 50 characters').optional().or(z.literal('')),
});

const updateCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(100, 'Customer name must be less than 100 characters').optional(),
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters').optional(),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional().or(z.literal('')),
  address: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
  loyaltyPoints: z.number().int('Loyalty points must be an integer').min(0, 'Loyalty points cannot be negative').optional(),
  vatNumber: z.string().max(50, 'VAT number must be less than 50 characters').optional().or(z.literal('')),
  tinNumber: z.string().max(50, 'TIN number must be less than 50 characters').optional().or(z.literal('')),
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
    const { search, sortBy = 'name', sortOrder = 'asc', limit, offset } = req.query;
    
    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'loyaltyPoints': 'loyalty_points',
      'vatNumber': 'vat_number',
      'tinNumber': 'tin_number'
    };
    
    // Whitelist allowed sort orders to prevent SQL injection
    const allowedSortOrders = ['asc', 'desc'];
    
    // Validate and sanitize sortBy
    const sanitizedSortBy = allowedSortColumns[sortBy] || 'name';
    
    // Validate and sanitize sortOrder
    const sanitizedSortOrder = allowedSortOrders.includes(sortOrder.toLowerCase()) 
      ? sortOrder.toUpperCase() 
      : 'ASC';
    
    let dbCustomers;
    
    if (search) {
      const searchTerm = `%${search}%`;
      dbCustomers = query(
        `SELECT * FROM customers 
         WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder}`,
        [searchTerm, searchTerm, searchTerm]
      );
    } else {
      const sql = `SELECT * FROM customers ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder}`;
      dbCustomers = query(sql);
    }
    
    if (limit) {
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset || 0);
      dbCustomers = dbCustomers.slice(offsetNum, offsetNum + limitNum);
    }
    
    const customers = dbCustomers.map(dbToCustomer);
    res.json(customers);
  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch customers' 
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbCustomer = getById('customers', req.params.id);
    
    if (!dbCustomer) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Customer not found' 
      });
    }
    
    res.json(dbToCustomer(dbCustomer));
  } catch (error) {
    logger.error('Error fetching customer:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch customer' 
    });
  }
});

router.post('/', authMiddleware, activityLogger('Customers', 'Create Customer'), validateRequest(createCustomerSchema), (req, res) => {
  try {
    const existingCustomer = queryOne('SELECT * FROM customers WHERE email = ?', [req.body.email]);
    
    if (existingCustomer) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'A customer with this email already exists' 
      });
    }
    
    const dbCustomer = customerToDb(req.body);
    insert('customers', dbCustomer);
    
    res.status(201).json(req.body);
  } catch (error) {
    logger.error('Error creating customer:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to create customer' 
    });
  }
});

router.put('/:id', authMiddleware, activityLogger('Customers', 'Update Customer'), validateRequest(updateCustomerSchema), (req, res) => {
  try {
    const customerId = req.params.id;
    
    const existingCustomer = getById('customers', customerId);
    
    if (!existingCustomer) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Customer not found' 
      });
    }
    
    if (req.body.email) {
      const emailConflict = queryOne(
        'SELECT * FROM customers WHERE email = ? AND id != ?', 
        [req.body.email, customerId]
      );
      
      if (emailConflict) {
        return res.status(409).json({ 
          error: 'Conflict',
          message: 'Another customer with this email already exists' 
        });
      }
    }
    
    const currentCustomer = dbToCustomer(existingCustomer);
    const updatedCustomer = { ...currentCustomer, ...req.body };
    const dbCustomer = customerToDb(updatedCustomer);
    
    update('customers', customerId, dbCustomer);
    
    res.json(updatedCustomer);
  } catch (error) {
    logger.error('Error updating customer:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to update customer' 
    });
  }
});

router.delete('/:id', authMiddleware, activityLogger('Customers', 'Delete Customer'), (req, res) => {
  try {
    const customerId = req.params.id;
    
    const existingCustomer = getById('customers', customerId);
    
    if (!existingCustomer) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Customer not found' 
      });
    }
    
    const salesWithCustomer = queryOne(
      'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
      [customerId]
    );
    
    if (salesWithCustomer && salesWithCustomer.count > 0) {
      logger.warn(`Cannot delete customer ${customerId}: ${salesWithCustomer.count} sales records depend on this customer`);
      return res.status(409).json({ 
        error: 'Cannot delete customer',
        message: `Cannot delete customer. ${salesWithCustomer.count} sales records depend on this customer.` 
      });
    }
    
    remove('customers', customerId);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting customer:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to delete customer' 
    });
  }
});

module.exports = router;
