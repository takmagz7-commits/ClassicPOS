const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { storeToDb, dbToStore } = require('../db/helpers.cjs');

router.get('/', (req, res) => {
  try {
    const dbStores = getAll('stores');
    const stores = dbStores.map(dbToStore);
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbStore = getById('stores', req.params.id);
    if (!dbStore) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(dbToStore(dbStore));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbStore = storeToDb(req.body);
    insert('stores', dbStore);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const dbStore = storeToDb(req.body);
    update('stores', req.params.id, dbStore);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { count } = require('../db/dbService.cjs');
    const { logger } = require('../utils/logger.cjs');
    
    const storeId = req.params.id;
    
    // Check for related sales
    const salesCount = count('sales', 'store_id = ?', [storeId]);
    if (salesCount > 0) {
      logger.warn(`Cannot delete store ${storeId}: has ${salesCount} related sales`);
      return res.status(409).json({ 
        error: 'Cannot delete store',
        message: `This store has ${salesCount} related sale(s). Please delete or reassign those first.`
      });
    }
    
    // Check for related GRNs
    const grnCount = count('grns', 'receiving_store_id = ?', [storeId]);
    if (grnCount > 0) {
      logger.warn(`Cannot delete store ${storeId}: has ${grnCount} related GRNs`);
      return res.status(409).json({ 
        error: 'Cannot delete store',
        message: `This store has ${grnCount} goods received note(s). Please delete or reassign those first.`
      });
    }
    
    // Check for related stock adjustments
    const adjustmentCount = count('stock_adjustments', 'store_id = ?', [storeId]);
    if (adjustmentCount > 0) {
      logger.warn(`Cannot delete store ${storeId}: has ${adjustmentCount} related stock adjustments`);
      return res.status(409).json({ 
        error: 'Cannot delete store',
        message: `This store has ${adjustmentCount} stock adjustment(s). Please delete those first.`
      });
    }
    
    // Check for related transfers (from or to)
    const transferFromCount = count('transfers', 'transfer_from_store_id = ?', [storeId]);
    const transferToCount = count('transfers', 'transfer_to_store_id = ?', [storeId]);
    const totalTransfers = transferFromCount + transferToCount;
    if (totalTransfers > 0) {
      logger.warn(`Cannot delete store ${storeId}: has ${totalTransfers} related transfers`);
      return res.status(409).json({ 
        error: 'Cannot delete store',
        message: `This store has ${totalTransfers} transfer(s) of goods. Please delete those first.`
      });
    }
    
    // Check for staff assigned to this store (users table doesn't have store_id in current schema)
    // If it did, we would check: const staffCount = count('users', 'store_id = ?', [storeId]);
    
    remove('stores', req.params.id);
    logger.info(`Store ${storeId} deleted successfully`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting store:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
