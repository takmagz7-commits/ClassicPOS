const { getDatabase } = require('../db/sqlite.cjs');
const { logger } = require('../utils/logger.cjs');

const databaseReadinessMiddleware = (req, res, next) => {
  try {
    const db = getDatabase();
    
    if (!db) {
      logger.warn('Database not initialized for request:', req.path);
      return res.status(503).json({
        error: 'Database not ready',
        message: 'Database is initializing. Please wait a moment and try again.',
        code: 'DB_NOT_READY'
      });
    }

    const result = db.prepare('SELECT 1 as test').get();
    
    if (!result) {
      logger.error('Database health check failed for request:', req.path);
      return res.status(503).json({
        error: 'Database error',
        message: 'Database is not responding. Please try again.',
        code: 'DB_ERROR'
      });
    }

    next();
  } catch (error) {
    logger.error('Database readiness check error:', error);
    return res.status(503).json({
      error: 'Database error',
      message: 'Unable to connect to database. Please try again.',
      code: 'DB_CONNECTION_ERROR',
      details: error.message
    });
  }
};

module.exports = databaseReadinessMiddleware;
