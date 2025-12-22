// ============================================
// TRAPMAP – SECURITY MIDDLEWARE
// Alles in einer Datei - keine externen Dependencies
// ============================================

const rateLimit = require('express-rate-limit');

// ============================================
// FAILED LOGIN TRACKER (In-Memory)
// ============================================
const failedLogins = new Map();
const BLOCK_DURATION = 15 * 60 * 1000; // 15 Minuten
const MAX_FAILED_ATTEMPTS = 5;

const trackFailedLogin = (ip, email) => {
  const key = `${ip}:${email}`;
  const current = failedLogins.get(key) || { count: 0, firstAttempt: Date.now() };
  
  if (Date.now() - current.firstAttempt > BLOCK_DURATION) {
    failedLogins.set(key, { count: 1, firstAttempt: Date.now() });
    return false;
  }
  
  current.count++;
  failedLogins.set(key, current);
  
  if (current.count >= MAX_FAILED_ATTEMPTS) {
    console.log(`🚨 SECURITY: IP ${ip} blocked after ${current.count} failed attempts for ${email}`);
    return true;
  }
  
  return false;
};

const clearFailedLogins = (ip, email) => {
  const key = `${ip}:${email}`;
  failedLogins.delete(key);
};

const isBlocked = (ip, email) => {
  const key = `${ip}:${email}`;
  const current = failedLogins.get(key);
  
  if (!current) return false;
  
  if (Date.now() - current.firstAttempt > BLOCK_DURATION) {
    failedLogins.delete(key);
    return false;
  }
  
  return current.count >= MAX_FAILED_ATTEMPTS;
};

// ============================================
// RATE LIMITERS
// ============================================

// Allgemeiner API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Zu viele Anfragen. Bitte warten Sie 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strenger Limiter für Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Login-Versuche. Bitte warten Sie 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST'
});

// Passwort-Reset Limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Zu viele Passwort-Reset Anfragen.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// SECURITY EVENT LOGGER
// ============================================
const logSecurityEvent = (event, details) => {
  const timestamp = new Date().toISOString();
  console.log(`🔐 SECURITY [${timestamp}]: ${event}`, JSON.stringify(details));
  return { timestamp, event, ...details };
};

// ============================================
// INPUT SANITIZATION
// ============================================
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // KRITISCH: Arrays müssen als Arrays erhalten bleiben!
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitizeInput(item);
      } else if (typeof item === 'object' && item !== null) {
        return sanitizeObject(item);
      } else {
        return item;
      }
    });
  }
  
  // Objekte normal verarbeiten
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

// ============================================
// BLOCK CHECK MIDDLEWARE
// ============================================
const blockCheckMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const email = req.body?.email;
  
  if (email && isBlocked(ip, email)) {
    logSecurityEvent('BLOCKED_REQUEST', { ip, email });
    return res.status(429).json({
      error: 'Zugang temporär gesperrt',
      message: 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie 15 Minuten.'
    });
  }
  
  next();
};

// ============================================
// VALIDATION HELPERS
// ============================================
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('Mindestens 8 Zeichen');
  if (!/[A-Z]/.test(password)) errors.push('Mindestens ein Großbuchstabe');
  if (!/[a-z]/.test(password)) errors.push('Mindestens ein Kleinbuchstabe');
  if (!/[0-9]/.test(password)) errors.push('Mindestens eine Zahl');
  return { isValid: errors.length === 0, errors };
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Rate Limiters
  generalLimiter,
  loginLimiter,
  passwordResetLimiter,
  
  // Sanitization
  sanitizeMiddleware,
  sanitizeInput,
  
  // Security Logging
  logSecurityEvent,
  
  // Login Tracking
  trackFailedLogin,
  clearFailedLogins,
  isBlocked,
  blockCheckMiddleware,
  
  // Validation
  isValidEmail,
  validatePassword
};