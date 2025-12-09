// ============================================
// JWT UTILITIES
// Token generation and verification
// ============================================

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate JWT Access Token
 * @param {Object} payload - User data
 * @returns {string} JWT token
 */
const sign = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiry
  });
};

/**
 * Generate Refresh Token
 * @param {Object} payload - User data
 * @returns {string} Refresh token
 */
const signRefresh = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiry
  });
};

/**
 * Verify JWT Token
 * @param {string} token 
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verify = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
};

/**
 * Decode JWT without verification (for debugging)
 * @param {string} token 
 * @returns {Object|null}
 */
const decode = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

module.exports = {
  sign,
  signRefresh,
  verify,
  decode
};