const { logger } = require('../utils/logger.cjs');

const sanitizeError = (error) => {
  const errorMessage = error.message || '';
  
  if (errorMessage.includes('NOT NULL constraint failed')) {
    const field = errorMessage.match(/NOT NULL constraint failed: \w+\.(\w+)/);
    return {
      error: 'Validation error',
      message: field ? `${field[1]} is required` : 'Required field is missing'
    };
  }
  
  if (errorMessage.includes('UNIQUE constraint failed')) {
    const field = errorMessage.match(/UNIQUE constraint failed: \w+\.(\w+)/);
    return {
      error: 'Conflict',
      message: field ? `${field[1]} already exists` : 'This value already exists'
    };
  }
  
  if (errorMessage.includes('FOREIGN KEY constraint failed')) {
    return {
      error: 'Conflict',
      message: 'Cannot delete record with existing dependencies'
    };
  }
  
  if (errorMessage.includes('CHECK constraint failed')) {
    return {
      error: 'Validation error',
      message: 'Invalid data provided'
    };
  }
  
  if (errorMessage.includes('no such table')) {
    return {
      error: 'Server error',
      message: 'Database configuration error'
    };
  }
  
  if (errorMessage.includes('database is locked')) {
    return {
      error: 'Server error',
      message: 'Database is busy, please try again'
    };
  }
  
  return {
    error: 'Server error',
    message: 'An error occurred while processing your request'
  };
};

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.statusCode || err.status || 500;
  
  if (statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      error: err.error || 'Bad request',
      message: err.message || 'Invalid request'
    });
  }
  
  const sanitized = sanitizeError(err);
  res.status(500).json(sanitized);
};

module.exports = errorHandler;
