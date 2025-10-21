const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { purchaseOrderToDb, dbToPurchaseOrder } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const { activityLogger } = require('../middleware/activityLogger.cjs');
const { logger } = require('../utils/logger.cjs');

router.get('/', (req, res) => {
  try {
    const dbPOs = getAll('purchase_orders');
    const purchaseOrders = dbPOs.map(dbToPurchaseOrder);
    res.json(purchaseOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbPO = getById('purchase_orders', req.params.id);
    if (!dbPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(dbToPurchaseOrder(dbPO));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, activityLogger('Purchase Orders', 'Create Purchase Order'), (req, res) => {
  try {
    const dbPO = purchaseOrderToDb(req.body);
    insert('purchase_orders', dbPO);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, activityLogger('Purchase Orders', 'Update Purchase Order'), (req, res) => {
  try {
    const existing = getById('purchase_orders', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      logger.warn(`Attempt to modify ${existing.status} purchase order: ${req.params.id}`);
      return res.status(400).json({ 
        error: `Cannot modify ${existing.status} purchase orders` 
      });
    }
    
    const dbPO = purchaseOrderToDb(req.body);
    update('purchase_orders', req.params.id, dbPO);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, activityLogger('Purchase Orders', 'Delete Purchase Order'), (req, res) => {
  try {
    const existing = getById('purchase_orders', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      logger.warn(`Attempt to delete ${existing.status} purchase order: ${req.params.id}`);
      return res.status(400).json({ 
        error: `Cannot delete ${existing.status} purchase orders` 
      });
    }
    
    remove('purchase_orders', req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
