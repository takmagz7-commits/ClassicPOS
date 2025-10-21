const express = require('express');
const router = express.Router();
const { getAll, getById, insert } = require('../db/dbService.cjs');
const { inventoryHistoryToDb, dbToInventoryHistory } = require('../db/helpers.cjs');

router.get('/', (req, res) => {
  try {
    const dbEntries = getAll('inventory_history');
    const entries = dbEntries.map(dbToInventoryHistory);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbEntry = getById('inventory_history', req.params.id);
    if (!dbEntry) {
      return res.status(404).json({ error: 'Inventory history entry not found' });
    }
    res.json(dbToInventoryHistory(dbEntry));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbEntry = inventoryHistoryToDb(req.body);
    insert('inventory_history', dbEntry);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
