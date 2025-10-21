const jwt = require('jsonwebtoken');

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
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      mfaEnabled: decoded.mfaEnabled
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
