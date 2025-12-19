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

// GET all objects (nur aktive, optional mit include_archived=true)
router.get("/", authenticate, asyncHandler(objectsController.getAll));

// GET nur archivierte Objekte
router.get("/archived", authenticate, asyncHandler(objectsController.getArchived));

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
// ARCHIVE & RESTORE
// ============================================

// ARCHIVE object (Boxen zurück ins Lager)
router.post("/:id/archive", authenticate, requireEditor, asyncHandler(objectsController.archive));

// RESTORE archived object
router.post("/:id/restore", authenticate, requireEditor, asyncHandler(objectsController.restore));

// ============================================
// DELETE
// ============================================

// DELETE object (soft or hard depending on service)
router.delete("/:id", authenticate, requireEditor, asyncHandler(objectsController.remove));

// ============================================
// EXPORT
// ============================================

module.exports = router;