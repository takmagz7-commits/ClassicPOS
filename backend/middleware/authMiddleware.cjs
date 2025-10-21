const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/sqlite.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'classicpos-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authentication token provided' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.jti) {
      const db = getDatabase();
      const revokedToken = db.prepare('SELECT jti FROM revoked_tokens WHERE jti = ?').get(decoded.jti);
      
      if (revokedToken) {
        return res.status(401).json({ 
          error: 'Token revoked',
          message: 'This session has been terminated. Please login again.' 
        });
      }
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      mfaEnabled: decoded.mfaEnabled,
      jti: decoded.jti
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please login again.' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Authentication failed. Please login again.' 
    });
  }
};

module.exports = authMiddleware;
