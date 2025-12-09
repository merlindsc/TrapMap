const express = require('express');
const router = express.Router();

const { authenticate, requireEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const layoutsController = require('../controllers/layouts.controller');

// ========================================================
// GET all layouts for a specific object
// Example: /api/layouts?object_id=5
// ========================================================
router.get(
  '/',
  authenticate,
  asyncHandler(layoutsController.getAll)
);

// ========================================================
// GET single layout (inkl. Boxen, Zonen, Pins, Labels)
// ========================================================
router.get(
  '/:id',
  authenticate,
  asyncHandler(layoutsController.getOne)
);

// ========================================================
// CREATE new layout
// Editor-Rolle notwendig (Admin / Supervisor)
// ========================================================
router.post(
  '/',
  authenticate,
  requireEditor,
  asyncHandler(layoutsController.create)
);

// ========================================================
// UPDATE layout
// ========================================================
router.put(
  '/:id',
  authenticate,
  requireEditor,
  asyncHandler(layoutsController.update)
);

// ========================================================
// DELETE layout
// ========================================================
router.delete(
  '/:id',
  authenticate,
  requireEditor,
  asyncHandler(layoutsController.remove)
);

module.exports = router;
