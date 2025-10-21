const { isSystemInitialized } = require('../utils/systemSettings.cjs');
const { logger } = require('../utils/logger.cjs');

const registrationLockMiddleware = (req, res, next) => {
  if (isSystemInitialized()) {
    logger.warn('Registration attempt blocked - system already initialized');
    return res.status(403).json({
      error: 'Registration disabled',
      message: 'ClassicPOS is already configured. Please sign in with your admin credentials.',
      systemInitialized: true
    });
  }
  
  next();
};

module.exports = registrationLockMiddleware;
