const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { grnToDb, dbToGrn } = require('../db/helpers.cjs');
const { logger } = require('../utils/logger.cjs');

router.get('/', (req, res) => {
  try {
    const dbGRNs = getAll('grns');
    const grns = dbGRNs.map(dbToGrn);
    res.json(grns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbGRN = getById('grns', req.params.id);
    if (!dbGRN) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    res.json(dbToGrn(dbGRN));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbGRN = grnToDb(req.body);
    insert('grns', dbGRN);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = getById('grns', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (existing.status === 'approved') {
      logger.warn(`Attempt to modify approved GRN: ${req.params.id}`);
      return res.status(400).json({ 
        error: 'Cannot modify approved GRNs' 
      });
    }
    
    const dbGRN = grnToDb(req.body);
    update('grns', req.params.id, dbGRN);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existingGRN = getById('grns', req.params.id);
    
    if (!existingGRN) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (existingGRN.status === 'approved') {
      logger.warn(`Attempt to delete approved GRN: ${req.params.id}`);
      return res.status(400).json({ 
        error: 'Cannot delete approved GRNs' 
      });
    }

    const { getById: getProduct, update: updateProduct, query, insert: insertHistory, transaction } = require('../db/dbService.cjs');
    const { productToDb, dbToProduct, inventoryHistoryToDb } = require('../db/helpers.cjs');
    const crypto = require('crypto');

    // Perform stock reversal for approved GRNs in a transaction
    const performDeletion = () => {
      const grn = existingGRN;
      const items = JSON.parse(grn.items);

      // Only reverse stock if GRN was approved (meaning stock was added)
      if (grn.status === 'approved' && items && items.length > 0) {
        logger.info(`Reversing stock for deleted GRN ${grn.id}`);

        for (const item of items) {
          // Get current product
          const product = getProduct('products', item.productId);
          if (!product) {
            logger.warn(`Product ${item.productId} not found during GRN reversal`);
            continue;
          }

          const productData = dbToProduct(product);

          // Reverse stock: subtract the received quantity
          productData.stock = (productData.stock || 0) - item.quantityReceived;

          // Reverse stockByStore if applicable
          if (productData.stockByStore && grn.receiving_store_id) {
            productData.stockByStore[grn.receiving_store_id] = 
              (productData.stockByStore[grn.receiving_store_id] || 0) - item.quantityReceived;
          }

          // Update product
          updateProduct('products', item.productId, productToDb(productData));

          // Create reversal inventory history entry
          const historyEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            type: 'REVERSAL',
            referenceId: grn.id,
            description: `Stock reversed due to GRN deletion: ${grn.reference_no}`,
            productId: item.productId,
            productName: item.productName,
            quantityChange: -item.quantityReceived,
            currentStock: productData.stock,
            storeId: grn.receiving_store_id || null,
            storeName: grn.receiving_store_name || null,
            userId: null,
            userName: 'System (GRN Deletion)'
          };

          insertHistory('inventory_history', inventoryHistoryToDb(historyEntry));
          logger.info(`Reversed ${item.quantityReceived} units of ${item.productName}`);
        }
      }

      // Delete the GRN
      remove('grns', req.params.id);
      logger.info(`GRN ${grn.id} deleted successfully`);
    };

    transaction(performDeletion);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting GRN:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
