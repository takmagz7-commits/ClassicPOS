const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { stockAdjustmentToDb, dbToStockAdjustment } = require('../db/helpers.cjs');
const { logger } = require('../utils/logger.cjs');

router.get('/', (req, res) => {
  try {
    const dbAdjustments = getAll('stock_adjustments');
    const adjustments = dbAdjustments.map(dbToStockAdjustment);
    res.json(adjustments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbAdjustment = getById('stock_adjustments', req.params.id);
    if (!dbAdjustment) {
      return res.status(404).json({ error: 'Stock adjustment not found' });
    }
    res.json(dbToStockAdjustment(dbAdjustment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbAdjustment = stockAdjustmentToDb(req.body);
    insert('stock_adjustments', dbAdjustment);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = getById('stock_adjustments', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Stock adjustment not found' });
    }
    
    if (existing.status === 'approved') {
      logger.warn(`Attempt to modify approved stock adjustment: ${req.params.id}`);
      return res.status(400).json({ 
        error: 'Cannot modify approved stock adjustments' 
      });
    }
    
    const dbAdjustment = stockAdjustmentToDb(req.body);
    update('stock_adjustments', req.params.id, dbAdjustment);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existingAdjustment = getById('stock_adjustments', req.params.id);
    
    if (!existingAdjustment) {
      return res.status(404).json({ error: 'Stock adjustment not found' });
    }
    
    if (existingAdjustment.status === 'approved') {
      logger.warn(`Attempt to delete approved stock adjustment: ${req.params.id}`);
      return res.status(400).json({ 
        error: 'Cannot delete approved stock adjustments' 
      });
    }

    const { getById: getProduct, update: updateProduct, query, insert: insertHistory, transaction } = require('../db/dbService.cjs');
    const { productToDb, dbToProduct, inventoryHistoryToDb } = require('../db/helpers.cjs');
    const crypto = require('crypto');

    // Perform stock reversal in a transaction
    const performDeletion = () => {
      const adjustment = existingAdjustment;
      const items = JSON.parse(adjustment.items);

      // Reverse all stock adjustments
      if (items && items.length > 0) {
        logger.info(`Reversing stock for deleted adjustment ${adjustment.id}`);

        for (const item of items) {
          // Get current product
          const product = getProduct('products', item.productId);
          if (!product) {
            logger.warn(`Product ${item.productId} not found during adjustment reversal`);
            continue;
          }

          const productData = dbToProduct(product);

          // Reverse stock: opposite of the adjustment type
          const reversalQuantity = -item.quantityChange;
          productData.stock = (productData.stock || 0) + reversalQuantity;

          // Reverse stockByStore if applicable
          if (productData.stockByStore && adjustment.store_id) {
            productData.stockByStore[adjustment.store_id] = 
              (productData.stockByStore[adjustment.store_id] || 0) + reversalQuantity;
          }

          // Update product
          updateProduct('products', item.productId, productToDb(productData));

          // Create reversal inventory history entry
          const historyEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            type: 'REVERSAL',
            referenceId: adjustment.id,
            description: `Stock reversed due to adjustment deletion: ${item.adjustmentType} adjustment`,
            productId: item.productId,
            productName: item.productName,
            quantityChange: reversalQuantity,
            currentStock: productData.stock,
            storeId: adjustment.store_id || null,
            storeName: adjustment.store_name || null,
            userId: null,
            userName: 'System (Adjustment Deletion)'
          };

          insertHistory('inventory_history', inventoryHistoryToDb(historyEntry));
          logger.info(`Reversed ${Math.abs(reversalQuantity)} units of ${item.productName}`);
        }
      }

      // Delete the adjustment
      remove('stock_adjustments', req.params.id);
      logger.info(`Stock adjustment ${adjustment.id} deleted successfully`);
    };

    transaction(performDeletion);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting stock adjustment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
