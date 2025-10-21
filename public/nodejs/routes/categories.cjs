const express = require('express');
const router = express.Router();
const { getAll, getById, insert, update, remove } = require('../db/dbService.cjs');
const { categoryToDb, dbToCategory } = require('../db/helpers.cjs');

router.get('/', (req, res) => {
  try {
    const dbCategories = getAll('categories');
    const categories = dbCategories.map(dbToCategory);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const dbCategory = getById('categories', req.params.id);
    if (!dbCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(dbToCategory(dbCategory));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const dbCategory = categoryToDb(req.body);
    insert('categories', dbCategory);
    res.status(201).json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const dbCategory = categoryToDb(req.body);
    update('categories', req.params.id, dbCategory);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    remove('categories', req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
