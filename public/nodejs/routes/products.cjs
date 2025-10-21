const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { productToDb, dbToProduct } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');

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
 *       500:
 *         description: Server error
 */
router.get('/', (req, res) => {
  try {
    const dbProducts = getAll('products');
    const products = dbProducts.map(dbToProduct);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbProduct = getById('products', req.params.id);
    if (!dbProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(dbToProduct(dbProduct));
  } catch (error) {
    res.status(500).json({ error: error.message });
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
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, activityLogger('Products', 'Create Product'), (req, res) => {
  try {
    const dbProduct = productToDb(req.body);
    insert('products', dbProduct);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, activityLogger('Products', 'Update Product'), (req, res) => {
  try {
    const dbProduct = productToDb(req.body);
    update('products', req.params.id, dbProduct);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, activityLogger('Products', 'Delete Product'), (req, res) => {
  try {
    remove('products', req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
