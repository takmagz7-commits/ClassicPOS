const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { taxRateToDb, dbToTaxRate } = require('../db/helpers.cjs');

router.get('/', (req, res) => {
  try {
    const dbTaxRates = getAll('tax_rates');
    const taxRates = dbTaxRates.map(dbToTaxRate);
    res.json(taxRates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbTaxRate = getById('tax_rates', req.params.id);
    if (!dbTaxRate) {
      return res.status(404).json({ error: 'Tax rate not found' });
    }
    res.json(dbToTaxRate(dbTaxRate));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbTaxRate = taxRateToDb(req.body);
    insert('tax_rates', dbTaxRate);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const dbTaxRate = taxRateToDb(req.body);
    update('tax_rates', req.params.id, dbTaxRate);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    remove('tax_rates', req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
