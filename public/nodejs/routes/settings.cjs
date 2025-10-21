const express = require('express');
const router = express.Router();
const { getSetting, setSetting, query } = require('../db/dbService.cjs');

router.get('/', (req, res) => {
  try {
    const settings = query('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:key', (req, res) => {
  try {
    const value = getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:key', (req, res) => {
  try {
    const { value } = req.body;
    setSetting(req.params.key, value);
    res.json({ key: req.params.key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
