const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getAll, getById, insert, query } = require('../db/dbService.cjs');
const { activityLogToDb, dbToActivityLog } = require('../db/helpers.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');

router.get('/', authMiddleware, (req, res) => {
  try {
    const { userId, module, action, startDate, endDate, limit = 100 } = req.query;
    
    let sqlQuery = 'SELECT * FROM activity_logs';
    const params = [];
    const conditions = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }

    if (action) {
      conditions.push('action LIKE ?');
      params.push(`%${action}%`);
    }

    if (startDate) {
      conditions.push('timestamp >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('timestamp <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }

    sqlQuery += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    const dbLogs = query(sqlQuery, params);
    const logs = dbLogs.map(dbToActivityLog);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const dbLog = getById('activity_logs', req.params.id);
    if (!dbLog) {
      return res.status(404).json({ error: 'Activity log not found' });
    }
    res.json(dbToActivityLog(dbLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { userId, userName, action, module, details, ipAddress } = req.body;

    if (!userId || !userName || !action || !module) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userId, userName, action, and module are required'
      });
    }

    const newLog = {
      id: crypto.randomUUID(),
      userId,
      userName,
      action,
      module,
      details: details || undefined,
      ipAddress: ipAddress || undefined,
      timestamp: new Date().toISOString(),
    };

    const dbLog = activityLogToDb(newLog);
    insert('activity_logs', dbLog);

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/stats', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateCondition = '';
    const params = [];

    if (startDate && endDate) {
      dateCondition = 'WHERE timestamp >= ? AND timestamp <= ?';
      params.push(startDate, endDate);
    }

    const totalLogs = query(
      `SELECT COUNT(*) as count FROM activity_logs ${dateCondition}`,
      params
    )[0]?.count || 0;

    const logsByModule = query(
      `SELECT module, COUNT(*) as count FROM activity_logs ${dateCondition} GROUP BY module`,
      params
    );

    const logsByUser = query(
      `SELECT user_name, COUNT(*) as count FROM activity_logs ${dateCondition} GROUP BY user_name ORDER BY count DESC LIMIT 10`,
      params
    );

    const recentLogs = query(
      `SELECT * FROM activity_logs ${dateCondition} ORDER BY timestamp DESC LIMIT 20`,
      params
    ).map(dbToActivityLog);

    res.json({
      totalLogs,
      logsByModule,
      logsByUser,
      recentLogs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
