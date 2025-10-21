const crypto = require('crypto');
const { insert } = require('../db/dbService.cjs');
const { activityLogToDb } = require('../db/helpers.cjs');
const { logger } = require('../utils/logger.cjs');

const activityLogger = (module, action = null) => {
  return (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function (data) {
      logActivity(req, res, module, action);
      originalSend.call(this, data);
    };

    res.json = function (data) {
      logActivity(req, res, module, action);
      originalJson.call(this, data);
    };

    next();
  };
};

const logActivity = (req, res, module, providedAction = null) => {
  try {
    if (!req.user) return;

    const method = req.method;
    const statusCode = res.statusCode;

    if (statusCode < 200 || statusCode >= 300) return;

    let action = providedAction;
    
    if (!action) {
      switch (method) {
        case 'POST':
          action = req.path.includes('clock-in') ? 'Clock In' :
                   req.path.includes('clock-out') ? 'Clock Out' :
                   req.path.includes('approve') ? 'Approve' :
                   req.path.includes('pay') ? 'Pay' :
                   req.path.includes('calculate') ? 'Calculate' :
                   'Create';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'Update';
          break;
        case 'DELETE':
          action = 'Delete';
          break;
        case 'GET':
          if (req.path.includes('summary') || req.path.includes('report')) {
            action = 'View Report';
          } else if (req.path.match(/\/\d+$/)) {
            action = 'View Details';
          } else {
            action = 'View List';
          }
          break;
        default:
          action = method;
      }
    }

    const details = {
      path: req.path,
      method: req.method,
      params: req.params,
      query: req.query,
    };

    const log = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userName: req.user.email || req.user.fullName || 'Unknown',
      action,
      module,
      details: JSON.stringify(details),
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
    };

    const dbLog = activityLogToDb(log);
    insert('activity_logs', dbLog);
  } catch (error) {
    logger.error('Activity logging error:', error);
  }
};

const logCustomActivity = (userId, userName, action, module, details = null, ipAddress = null) => {
  try {
    const log = {
      id: crypto.randomUUID(),
      userId,
      userName,
      action,
      module,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      timestamp: new Date().toISOString(),
    };

    const dbLog = activityLogToDb(log);
    insert('activity_logs', dbLog);
  } catch (error) {
    logger.error('Activity logging error:', error);
  }
};

module.exports = {
  activityLogger,
  logCustomActivity,
};
