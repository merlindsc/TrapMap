// ============================================
// BOXES ROUTES - KOMPLETT
// Inkl. Pool-Funktionen für Box-Lager
// Inkl. Re-Nummerierung
// Inkl. PUT /:id/position für GPS
// ============================================

const express = require("express");
const router = express.Router();

const boxesController = require("../controllers/boxes.controller");
const { authenticate, requireEditor, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// ============================================
// READ ROUTES
// ============================================

// WICHTIG: Spezifische Routes VOR /:id definieren!

// Boxen im Pool (ohne Objekt)
router.get("/pool", authenticate, asyncHandler(boxesController.getPool));

// Unplatzierte Boxen eines Objekts
router.get("/unplaced/:objectId", authenticate, asyncHandler(boxesController.getUnplaced));

// Scan-Historie einer Box
router.get("/:id/scans", authenticate, asyncHandler(boxesController.getScans));

// Alle Boxen (optional mit ?object_id=X)
router.get("/", authenticate, asyncHandler(boxesController.getAll));

// Einzelne Box
router.get("/:id", authenticate, asyncHandler(boxesController.getOne));

// ============================================
// WRITE ROUTES (erfordern Editor-Rolle)
// ============================================

// Box aktualisieren (PATCH - partielle Updates)
router.patch("/:id", authenticate, requireEditor, asyncHandler(boxesController.update));

// GPS Position setzen (PUT - NEU!)
router.put("/:id/position", authenticate, requireEditor, asyncHandler(boxesController.updatePosition));

// GPS Position ändern (alter Endpunkt - Kompatibilität)
router.patch("/:id/location", authenticate, requireEditor, asyncHandler(boxesController.updateLocation));

// GPS zurücksetzen auf Object-Position
router.patch("/:id/undo-location", authenticate, requireEditor, asyncHandler(boxesController.undoLocation));

// Box löschen (soft delete)
router.delete("/:id", authenticate, requireEditor, asyncHandler(boxesController.remove));

// ============================================
// POOL & PLATZIERUNG ROUTES
// ============================================

// Box einem Objekt zuweisen (aus Pool)
router.post("/:id/assign", authenticate, requireEditor, asyncHandler(boxesController.assignToObject));

// Box zurück in Pool
router.post("/:id/return-to-pool", authenticate, requireEditor, asyncHandler(boxesController.returnToPool));

// Box auf GPS-Karte platzieren
router.post("/:id/place-map", authenticate, requireEditor, asyncHandler(boxesController.placeOnMap));

// Box auf Lageplan platzieren
router.post("/:id/place-floorplan", authenticate, requireEditor, asyncHandler(boxesController.placeOnFloorPlan));

// Box zu anderem Objekt verschieben
router.put("/:id/move", authenticate, requireEditor, asyncHandler(boxesController.moveToObject));

// ============================================
// RE-NUMMERIERUNG ROUTES
// ============================================

// Boxen eines einzelnen Objekts neu nummerieren
router.post("/renumber/:objectId", authenticate, requireEditor, asyncHandler(boxesController.renumberObject));

// ALLE Boxen der Organisation neu nummerieren (nur Admin)
router.post("/renumber-all", authenticate, requireAdmin, asyncHandler(boxesController.renumberAll));

module.exports = router;