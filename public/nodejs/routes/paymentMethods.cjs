const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { paymentMethodToDb, dbToPaymentMethod } = require('../db/helpers.cjs');

router.get('/', (req, res) => {
  try {
    const dbMethods = getAll('payment_methods');
    const methods = dbMethods.map(dbToPaymentMethod);
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbMethod = getById('payment_methods', req.params.id);
    if (!dbMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    res.json(dbToPaymentMethod(dbMethod));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbMethod = paymentMethodToDb(req.body);
    insert('payment_methods', dbMethod);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const dbMethod = paymentMethodToDb(req.body);
    update('payment_methods', req.params.id, dbMethod);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    remove('payment_methods', req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
