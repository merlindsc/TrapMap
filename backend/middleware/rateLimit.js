const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later',
    retryAfter: Math.ceil(config.rateLimitWindow / 1000 / 60) + ' minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.nodeEnv === 'development'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too Many Login Attempts',
    message: 'Too many login attempts, please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => config.nodeEnv === 'development'
});

module.exports = generalLimiter;
module.exports.authLimiter = authLimiter;