const { logger } = require('../utils/logger.cjs');

function httpsRedirectMiddleware(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      const redirectUrl = `https://${req.hostname}${req.url}`;
      logger.warn(`HTTPS redirect: ${req.method} ${req.url} -> ${redirectUrl}`);
      return res.redirect(301, redirectUrl);
    }
  }
  next();
}

module.exports = httpsRedirectMiddleware;
