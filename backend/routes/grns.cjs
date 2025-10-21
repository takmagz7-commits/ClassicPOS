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
        error: 'Cannot delete approved GRN',
        message: 'Cannot delete approved GRN. Only pending GRNs can be deleted.'
      });
    }

    remove('grns', req.params.id);
    logger.info(`Deleted pending GRN: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting GRN:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to delete GRN' });
  }
});

module.exports = router;
