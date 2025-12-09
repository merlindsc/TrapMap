// ============================================
// ERROR HANDLER MIDDLEWARE
// Centralized error handling
// ============================================

const config = require('../config/env');

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  const errorResponse = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Include stack trace in development
  if (config.nodeEnv !== 'production') {
    errorResponse.stack = err.stack;
  }

  // Determine status code
  let statusCode = err.statusCode || 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.message = 'Validation failed';
    errorResponse.details = err.details || err.message;
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.error = 'Unauthorized';
    errorResponse.message = 'Invalid or expired token';
  }

  if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error = 'Forbidden';
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    errorResponse.error = 'Conflict';
    errorResponse.message = 'Resource already exists';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    errorResponse.error = 'Bad Request';
    errorResponse.message = 'Invalid reference to related resource';
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};