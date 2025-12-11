/* ============================================================
   TRAPMAP – QR ROUTES (IMPROVED)
   
   Endpoints für QR-Code Management:
   - GET /api/qr/codes - Alle Codes der Organisation
   - GET /api/qr/codes/available - Freie Codes
   - POST /api/qr/generate - Codes generieren
   - POST /api/qr/assign - Code einer Box zuweisen
   - POST /api/qr/unassign - Code von Box entfernen
   - POST /api/qr/assign-object - Code einem Objekt zuweisen
   - DELETE /api/qr/codes/:code - Code löschen
   - GET /api/qr/scan/:code - Code scannen (öffentlich)
   - GET /api/qr/check/:code - Code prüfen
   
   Ersetzt die bestehende qr.routes.js!
   ============================================================ */

const express = require("express");
const router = express.Router();
const { authenticate, requireEditor, optionalAuth } = require("../middleware/auth");
const qrService = require("../services/qr.service");

// ============================================
// ALLE CODES DER ORGANISATION
// GET /api/qr/codes
// ============================================
router.get("/codes", authenticate, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const codes = await qrService.getCodesByOrganisation(organisationId);
    res.json(codes);
  } catch (err) {
    console.error("Get codes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// FREIE CODES (nicht zugewiesen)
// GET /api/qr/codes/available?object_id=123
// ============================================
router.get("/codes/available", authenticate, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { object_id } = req.query;
    
    const codes = await qrService.getAvailableCodes(organisationId, object_id);
    res.json(codes);
  } catch (err) {
    console.error("Get available codes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CODES GENERIEREN
// POST /api/qr/generate
// Body: { count: 10, object_id?: 123 }
// ============================================
router.post("/generate", authenticate, requireEditor, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { count = 1, object_id } = req.body;

    if (count < 1 || count > 1000) {
      return res.status(400).json({ error: "count muss zwischen 1 und 1000 sein" });
    }

    const codes = await qrService.generateCodes(organisationId, count, object_id);
    
    res.json({
      success: true,
      count: codes.length,
      codes
    });
  } catch (err) {
    console.error("Generate codes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CODE EINER BOX ZUWEISEN
// POST /api/qr/assign
// Body: { code: "TM-XXXX-XXXX-XXXX", box_id: 123 }
// ============================================
router.post("/assign", authenticate, requireEditor, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { code, box_id } = req.body;

    if (!code || !box_id) {
      return res.status(400).json({ error: "code und box_id erforderlich" });
    }

    const result = await qrService.assignCode(code, box_id, organisationId);
    res.json(result);
  } catch (err) {
    console.error("Assign code error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================
// CODE VON BOX ENTFERNEN
// POST /api/qr/unassign
// Body: { code: "TM-XXXX-XXXX-XXXX" }
// ============================================
router.post("/unassign", authenticate, requireEditor, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "code erforderlich" });
    }

    const result = await qrService.unassignCode(code, organisationId);
    res.json(result);
  } catch (err) {
    console.error("Unassign code error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================
// CODE EINEM OBJEKT ZUWEISEN (ohne Box)
// POST /api/qr/assign-object
// Body: { code: "TM-XXXX-XXXX-XXXX", object_id: 123 }
// ============================================
router.post("/assign-object", authenticate, requireEditor, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { code, object_id } = req.body;

    if (!code || !object_id) {
      return res.status(400).json({ error: "code und object_id erforderlich" });
    }

    const result = await qrService.assignCodeToObject(code, object_id, organisationId);
    res.json(result);
  } catch (err) {
    console.error("Assign to object error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================
// CODE LÖSCHEN (nur unzugewiesene!)
// DELETE /api/qr/codes/:code
// ============================================
router.delete("/codes/:code", authenticate, requireEditor, async (req, res) => {
  try {
    const organisationId = req.user.organisation_id;
    const { code } = req.params;

    const result = await qrService.deleteCode(code, organisationId);
    res.json(result);
  } catch (err) {
    console.error("Delete code error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================
// CODE PRÜFEN (mit Auth)
// GET /api/qr/check/:code
// ============================================
router.get("/check/:code", authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const data = await qrService.checkCode(code);

    if (!data) {
      return res.status(404).json({ error: "Code nicht gefunden" });
    }

    res.json(data);
  } catch (err) {
    console.error("Check code error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CODE SCANNEN (öffentlich - für Partner/Techniker)
// GET /api/qr/scan/:code
// ============================================
router.get("/scan/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await qrService.scanByCode(code);
    res.json(result);
  } catch (err) {
    console.error("Scan code error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// LEGACY: Alte Endpunkte für Kompatibilität
// ============================================

// GET /api/qr/:code (alt) -> redirect zu /check/:code
router.get("/:code", authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const data = await qrService.checkCode(code);
    
    if (!data) {
      return res.status(404).json({ error: "Code nicht gefunden" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;