/* ============================================================
   TRAPMAP – BOXES ROUTES ERWEITERUNG
   
   Neue Endpoints für Box-Management:
   - PUT /api/boxes/:id/move - Box zu anderem Objekt verschieben
   - POST /api/boxes/:id/assign-code - QR-Code zuweisen
   - DELETE /api/boxes/:id/qr-code - QR-Code entfernen
   - POST /api/boxes/bulk-move - Mehrere Boxen verschieben
   
   Diese Routes zu boxes.routes.js hinzufügen!
   ============================================================ */

const express = require("express");
const router = express.Router();
const { authenticate, requireEditor } = require("../middleware/auth");
const boxesService = require("../services/boxes.service");

// ============================================
// BOX ZU ANDEREM OBJEKT VERSCHIEBEN
// PUT /api/boxes/:id/move
// ============================================
router.put("/:id/move", authenticate, requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const { object_id } = req.body;
    const organisationId = req.user.organisation_id;

    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
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

// ============================================
// QR-CODE EINER BOX ZUWEISEN
// POST /api/boxes/:id/assign-code
// ============================================
router.post("/:id/assign-code", authenticate, requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const { qr_code } = req.body;
    const organisationId = req.user.organisation_id;

    if (!qr_code) {
      return res.status(400).json({ error: "qr_code erforderlich" });
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

// ============================================
// QR-CODE VON BOX ENTFERNEN
// DELETE /api/boxes/:id/qr-code
// ============================================
router.delete("/:id/qr-code", authenticate, requireEditor, async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisation_id;

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

// ============================================
// MEHRERE BOXEN VERSCHIEBEN
// POST /api/boxes/bulk-move
// ============================================
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

    const result = await boxesService.bulkMoveToObject(box_ids, object_id, organisationId);

    res.json(result);
  } catch (err) {
    console.error("Bulk move error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;