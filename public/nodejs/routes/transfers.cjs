const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { transferToDb, dbToTransfer } = require('../db/helpers.cjs');
const { logger } = require('../utils/logger.cjs');

router.get('/', (req, res) => {
  try {
    const dbTransfers = getAll('transfers');
    const transfers = dbTransfers.map(dbToTransfer);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbTransfer = getById('transfers', req.params.id);
    if (!dbTransfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    res.json(dbToTransfer(dbTransfer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbTransfer = transferToDb(req.body);
    insert('transfers', dbTransfer);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = getById('transfers', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    if (existing.status === 'completed' || existing.status === 'in-transit') {
      logger.warn(`Attempt to modify ${existing.status} transfer: ${req.params.id}`);
      return res.status(400).json({ 
        error: `Cannot modify ${existing.status} transfers` 
      });
    }
    
    const dbTransfer = transferToDb(req.body);
    update('transfers', req.params.id, dbTransfer);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existingTransfer = getById('transfers', req.params.id);
    
    if (!existingTransfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    if (existingTransfer.status === 'completed' || existingTransfer.status === 'in-transit') {
      logger.warn(`Attempt to delete ${existingTransfer.status} transfer: ${req.params.id}`);
      return res.status(400).json({ 
        error: `Cannot delete ${existingTransfer.status} transfers` 
      });
    }

    const { getById: getProduct, update: updateProduct, query, insert: insertHistory, transaction } = require('../db/dbService.cjs');
    const { productToDb, dbToProduct, inventoryHistoryToDb } = require('../db/helpers.cjs');
    const crypto = require('crypto');

    // Perform stock reversal in a transaction
    const performDeletion = () => {
      const transfer = existingTransfer;
      const items = JSON.parse(transfer.items);
      const status = transfer.status;

      // Only reverse stock if transfer was in-transit or received (not pending)
      if (status !== 'pending' && items && items.length > 0) {
        logger.info(`Reversing stock for deleted transfer ${transfer.id} (status: ${status})`);

        for (const item of items) {
          // Get current product
          const product = getProduct('products', item.productId);
          if (!product) {
            logger.warn(`Product ${item.productId} not found during transfer reversal`);
            continue;
          }

          const productData = dbToProduct(product);

          // If status is 'in-transit', reverse the reduction from source store
          if (status === 'in-transit' && productData.stockByStore && transfer.transfer_from_store_id) {
            productData.stockByStore[transfer.transfer_from_store_id] = 
              (productData.stockByStore[transfer.transfer_from_store_id] || 0) + item.quantity;
            productData.stock = (productData.stock || 0) + item.quantity;
            
            // Create reversal history for source store
            const historyEntry = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              type: 'REVERSAL',
              referenceId: transfer.id,
              description: `Stock reversed due to transfer deletion (from ${transfer.transfer_from_store_name})`,
              productId: item.productId,
              productName: item.productName,
              quantityChange: item.quantity,
              currentStock: productData.stock,
              storeId: transfer.transfer_from_store_id,
              storeName: transfer.transfer_from_store_name,
              userId: null,
              userName: 'System (Transfer Deletion)'
            };
            insertHistory('inventory_history', inventoryHistoryToDb(historyEntry));
          }

          // If status is 'received', reverse both reduction from source and addition to destination
          if (status === 'received' && productData.stockByStore) {
            // Reverse destination addition
            if (transfer.transfer_to_store_id) {
              productData.stockByStore[transfer.transfer_to_store_id] = 
                (productData.stockByStore[transfer.transfer_to_store_id] || 0) - item.quantity;
              
              const historyEntry1 = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                type: 'REVERSAL',
                referenceId: transfer.id,
                description: `Stock reversed due to transfer deletion (to ${transfer.transfer_to_store_name})`,
                productId: item.productId,
                productName: item.productName,
                quantityChange: -item.quantity,
                currentStock: productData.stock,
                storeId: transfer.transfer_to_store_id,
                storeName: transfer.transfer_to_store_name,
                userId: null,
                userName: 'System (Transfer Deletion)'
              };
              insertHistory('inventory_history', inventoryHistoryToDb(historyEntry1));
            }

            // Reverse source reduction
            if (transfer.transfer_from_store_id) {
              productData.stockByStore[transfer.transfer_from_store_id] = 
                (productData.stockByStore[transfer.transfer_from_store_id] || 0) + item.quantity;
              
              const historyEntry2 = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                type: 'REVERSAL',
                referenceId: transfer.id,
                description: `Stock reversed due to transfer deletion (from ${transfer.transfer_from_store_name})`,
                productId: item.productId,
                productName: item.productName,
                quantityChange: item.quantity,
                currentStock: productData.stock,
                storeId: transfer.transfer_from_store_id,
                storeName: transfer.transfer_from_store_name,
                userId: null,
                userName: 'System (Transfer Deletion)'
              };
              insertHistory('inventory_history', inventoryHistoryToDb(historyEntry2));
            }
          }

          // Update product
          updateProduct('products', item.productId, productToDb(productData));
          logger.info(`Reversed ${item.quantity} units of ${item.productName} for transfer`);
        }
      }

      // Delete the transfer
      remove('transfers', req.params.id);
      logger.info(`Transfer ${transfer.id} deleted successfully`);
    };

    transaction(performDeletion);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
