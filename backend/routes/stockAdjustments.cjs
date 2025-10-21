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
        error: 'Cannot delete approved stock adjustment',
        message: 'Cannot delete approved stock adjustment. Only pending adjustments can be deleted.'
      });
    }

    remove('stock_adjustments', req.params.id);
    logger.info(`Deleted pending stock adjustment: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting stock adjustment:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to delete stock adjustment' });
  }
});

module.exports = router;
