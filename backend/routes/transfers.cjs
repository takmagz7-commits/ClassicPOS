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
        error: `Cannot delete ${existingTransfer.status} transfer`,
        message: `Cannot delete ${existingTransfer.status} transfer. Only pending transfers can be deleted.`
      });
    }

    remove('transfers', req.params.id);
    logger.info(`Deleted pending transfer: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting transfer:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to delete transfer' });
  }
});

module.exports = router;
