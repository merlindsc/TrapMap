// ============================================
// AUTH ROUTES
// Login, Logout, Password Management
// ============================================

const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Email Service (optional - für Passwort-Reset)
let emailService = null;
try {
  emailService = require('../services/email.service');
} catch (e) {
  console.log('Email service not available - password reset emails disabled');
}

// ============================================
// LOGIN
// ============================================
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  }

  const result = await authService.login(email, password);

  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  res.json({
    token: result.token,
    refreshToken: result.refreshToken,
    user: result.user
  });
}));

// ============================================
// REFRESH TOKEN
// ============================================
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  const result = await authService.refreshToken(refreshToken);

  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  res.json({ token: result.token });
}));

// ============================================
// CHANGE PASSWORD (eingeloggt)
// ============================================
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen haben' });
  }

  const result = await authService.changePassword(req.user.user_id, currentPassword, newPassword);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// ============================================
// SET NEW PASSWORD (nach erstem Login)
// ============================================
router.post('/set-password', authenticate, asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'Neues Passwort erforderlich' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
  }

  const result = await authService.setNewPassword(req.user.user_id, newPassword);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// ============================================
// FORGOT PASSWORD (Passwort vergessen)
// ============================================
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-Mail erforderlich' });
  }

  const sendEmailFn = emailService ? emailService.sendPasswordResetEmail : null;
  const result = await authService.forgotPassword(email, sendEmailFn);

  // Immer Erfolg zurückgeben (Security)
  res.json({ message: result.message });
}));

// ============================================
// RESET PASSWORD (mit Token aus Email)
// ============================================
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
  }

  const result = await authService.resetPasswordWithToken(token, newPassword);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

module.exports = router;