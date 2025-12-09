// ============================================
// BOXES ROUTES - KOMPLETT
// ============================================

const express = require("express");
const router = express.Router();

const boxesController = require("../controllers/boxes.controller");
const { authenticate, requireEditor } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// ============================================
// READ ROUTES
// ============================================

// WICHTIG: Spezifische Routes VOR /:id definieren!
router.get("/:id/scans", authenticate, asyncHandler(boxesController.getScans));

// Alle Boxen (optional mit ?object_id=X)
router.get("/", authenticate, asyncHandler(boxesController.getAll));

// Einzelne Box
router.get("/:id", authenticate, asyncHandler(boxesController.getOne));

// ============================================
// WRITE ROUTES (erfordern Editor-Rolle)
// ============================================

// Box erstellen
router.post("/", authenticate, requireEditor, asyncHandler(boxesController.create));

// Box aktualisieren
router.patch("/:id", authenticate, requireEditor, asyncHandler(boxesController.update));

// GPS Position ändern
router.patch("/:id/location", authenticate, requireEditor, asyncHandler(boxesController.updateLocation));

// GPS zurücksetzen auf Object-Position
router.patch("/:id/undo-location", authenticate, requireEditor, asyncHandler(boxesController.undoLocation));

// Box löschen (soft delete)
router.delete("/:id", authenticate, requireEditor, asyncHandler(boxesController.remove));

module.exports = router;