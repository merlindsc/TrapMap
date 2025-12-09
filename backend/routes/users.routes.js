const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');

// Placeholder - will be implemented later
router.get('/', authenticate, requireAdmin, (req, res) => {
  res.json({ message: 'Users endpoint - to be implemented' });
});

module.exports = router;