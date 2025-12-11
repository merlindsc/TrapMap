// ============================================
// BOXES ROUTES - KOMPLETT
// Basis Routes + Erweiterungen
// ============================================

const express = require("express");
const router = express.Router();

const boxesController = require("../controllers/boxes.controller");
const boxesService = require("../services/boxes.service");
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

// ============================================
// ERWEITERUNGEN - Box verschieben & QR-Codes
// ============================================

// Box zu anderem Objekt verschieben
router.put("/:id/move", authenticate, requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const { object_id } = req.body;
    const organisationId = req.user.organisation_id;

    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    // Prüfe ob Funktion existiert
    if (!boxesService.moveToObject) {
      return res.status(501).json({ error: "Funktion nicht implementiert" });
    }

    const result = await boxesService.moveToObject(id, object_id, organisationId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result.data);
  } catch (err) {
    console.error("Move box error:", err);
    res.status(500).json({ error: err.message });
  }
});

// QR-Code einer Box zuweisen
router.post("/:id/assign-code", authenticate, requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const { qr_code } = req.body;
    const organisationId = req.user.organisation_id;

    if (!qr_code) {
      return res.status(400).json({ error: "qr_code erforderlich" });
    }

    if (!boxesService.assignQrCode) {
      return res.status(501).json({ error: "Funktion nicht implementiert" });
    }

    const result = await boxesService.assignQrCode(id, qr_code, organisationId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result.data);
  } catch (err) {
    console.error("Assign QR code error:", err);
    res.status(500).json({ error: err.message });
  }
});

// QR-Code von Box entfernen
router.delete("/:id/qr-code", authenticate, requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisation_id;

    if (!boxesService.removeQrCode) {
      return res.status(501).json({ error: "Funktion nicht implementiert" });
    }

    const result = await boxesService.removeQrCode(id, organisationId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result.data);
  } catch (err) {
    console.error("Remove QR code error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mehrere Boxen verschieben
router.post("/bulk-move", authenticate, requireEditor, async (req, res) => {
  try {
    const { box_ids, object_id } = req.body;
    const organisationId = req.user.organisation_id;

    if (!box_ids || !Array.isArray(box_ids) || box_ids.length === 0) {
      return res.status(400).json({ error: "box_ids Array erforderlich" });
    }

    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    if (!boxesService.bulkMoveToObject) {
      return res.status(501).json({ error: "Funktion nicht implementiert" });
    }

    const result = await boxesService.bulkMoveToObject(box_ids, object_id, organisationId);

    res.json(result);
  } catch (err) {
    console.error("Bulk move error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;