// ============================================
// OBJECTS ROUTES (GPS ENABLED)
// ============================================

const express = require("express");
const router = express.Router();

const objectsController = require("../controllers/objects.controller");
const { authenticate, requireEditor } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// ============================================
// GET ROUTES
// ============================================

// GET all objects
router.get("/", authenticate, asyncHandler(objectsController.getAll));

// GET one object
router.get("/:id", authenticate, asyncHandler(objectsController.getOne));

// ============================================
// CREATE & UPDATE
// ============================================

// CREATE new object
router.post("/", authenticate, requireEditor, asyncHandler(objectsController.create));

// UPDATE object
router.patch("/:id", authenticate, requireEditor, asyncHandler(objectsController.update));

// ============================================
// GPS LOCATION
// ============================================

// UPDATE object location (GPS)
router.patch("/:id/location", authenticate, requireEditor, asyncHandler(objectsController.updateLocation));

// TOGGLE GPS edit mode
router.patch("/:id/gps-edit", authenticate, requireEditor, asyncHandler(objectsController.toggleGPSEdit));

// ============================================
// DELETE
// ============================================

// DELETE object (soft or hard depending on service)
router.delete("/:id", authenticate, requireEditor, asyncHandler(objectsController.remove));

// ============================================
// EXPORT
// ============================================

module.exports = router;