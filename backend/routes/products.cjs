const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { productToDb, dbToProduct } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { logger } = require('../utils/logger.cjs');

const createProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1, 'Product name is required').max(200, 'Product name must be less than 200 characters'),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU must be less than 100 characters'),
  barcode: z.string().max(100, 'Barcode must be less than 100 characters').optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Category ID is required'),
  categoryName: z.string().min(1, 'Category name is required'),
  stockQuantity: z.number().int('Stock quantity must be an integer').min(0, 'Stock quantity cannot be negative'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  costPrice: z.number().min(0, 'Cost price cannot be negative').optional(),
  taxRateId: z.string().optional().or(z.literal('')),
  taxRateName: z.string().optional().or(z.literal('')),
  taxRate: z.number().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(0).optional(),
  unit: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
});

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name must be less than 200 characters').optional(),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU must be less than 100 characters').optional(),
  barcode: z.string().max(100, 'Barcode must be less than 100 characters').optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Category ID is required').optional(),
  categoryName: z.string().min(1, 'Category name is required').optional(),
  stockQuantity: z.number().int('Stock quantity must be an integer').min(0, 'Stock quantity cannot be negative').optional(),
  unitPrice: z.number().min(0, 'Unit price cannot be negative').optional(),
  costPrice: z.number().min(0, 'Cost price cannot be negative').optional(),
  taxRateId: z.string().optional().or(z.literal('')),
  taxRateName: z.string().optional().or(z.literal('')),
  taxRate: z.number().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(0).optional(),
  unit: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
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

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', (req, res) => {
  try {
    const dbProducts = getAll('products');
    const products = dbProducts.map(dbToProduct);
    res.json(products);
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch products' 
    });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbProduct = getById('products', req.params.id);
    if (!dbProduct) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Product not found' 
      });
    }
    res.json(dbToProduct(dbProduct));
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to fetch product' 
    });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, activityLogger('Products', 'Create Product'), validateRequest(createProductSchema), (req, res) => {
  try {
    const dbProduct = productToDb(req.body);
    insert('products', dbProduct);
    res.status(201).json(req.body);
  } catch (error) {
    logger.error('Error creating product:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'A product with this SKU or barcode already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to create product' 
    });
  }
});

router.put('/:id', authMiddleware, activityLogger('Products', 'Update Product'), validateRequest(updateProductSchema), (req, res) => {
  try {
    const existingProduct = getById('products', req.params.id);
    
    if (!existingProduct) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Product not found' 
      });
    }
    
    const dbProduct = productToDb(req.body);
    update('products', req.params.id, dbProduct);
    res.json(req.body);
  } catch (error) {
    logger.error('Error updating product:', error);
    
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'A product with this SKU or barcode already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to update product' 
    });
  }
});

router.delete('/:id', authMiddleware, activityLogger('Products', 'Delete Product'), (req, res) => {
  try {
    const existingProduct = getById('products', req.params.id);
    
    if (!existingProduct) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Product not found' 
      });
    }
    
    remove('products', req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to delete product' 
    });
  }
});

module.exports = router;
