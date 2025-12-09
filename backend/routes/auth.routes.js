// ============================================
// AUTH ROUTES
// Login, Register, Token Refresh
// ============================================

const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');

// ============================================
// POST /api/auth/register
// Register new user
// ============================================
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username, role } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'username']
      });
    }

    const result = await authService.register({
      email,
      password,
      username,
      role: role || 'user'
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/auth/login
// User login
// ============================================
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required'
      });
    }

    const result = await authService.login(email, password);

    // Check if login was successful
    if (!result.success) {
      return res.status(401).json({
        error: result.message || 'Invalid credentials'
      });
    }

    res.json({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/auth/refresh
// Refresh JWT token
// ============================================
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    const newToken = await authService.refreshToken(req.user.id);

    res.json({
      message: 'Token refreshed',
      token: newToken
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/auth/me
// Get current user info
// ============================================
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);

    res.json({
      user
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/auth/logout
// Logout (optional, mainly for client-side token removal)
// ============================================
router.post('/logout', authenticate, (req, res) => {
  res.json({
    message: 'Logout successful'
  });
});

module.exports = router;