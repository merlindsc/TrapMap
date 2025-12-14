// ============================================
// QR CONTROLLER - KOMPLETT FIXED
// checkCode gibt FLACHE Datenstruktur zurück!
// ============================================

const qrService = require("../services/qr.service");

// POST /api/qr/generate - Codes + Boxen generieren
exports.generate = async (req, res) => {
  try {
    const { count } = req.body;
    const org = req.user.organisation_id;

    if (!count || count < 1 || count > 100) {
      return res.status(400).json({ error: "Count muss zwischen 1 und 100 liegen" });
    }

    const results = await qrService.generateCodes(org, count);

    res.json({
      success: true,
      count: results.length,
      codes: results.map((r) => r.code),
      boxes: results.map((r) => r.box_id)
    });
  } catch (err) {
    console.error("QR generate error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET /api/qr/check/:code - Code prüfen
// WICHTIG: Gibt FLACHE Struktur zurück für Scanner!
// ============================================
exports.check = async (req, res) => {
  try {
    const code = req.params.code;
    if (!code) {
      return res.status(400).json({ error: "Code fehlt" });
    }

    console.log(`🔍 checkCode: ${code}`);

    const result = await qrService.checkCode(code);

    // Code nicht in DB
    if (!result) {
      console.log(`❌ Code nicht gefunden: ${code}`);
      return res.json({ 
        found: false,
        box_id: null,
        object_id: null
      });
    }

    // Box-Daten extrahieren
    const box = result.boxes;

    // Code existiert aber keine Box verknüpft
    if (!box) {
      console.log(`⚠️ Code ohne Box: ${code}`);
      return res.json({
        found: true,
        qr_code: result.id,
        box_id: null,
        object_id: null
      });
    }

    // FLACHE Response für Scanner!
    const response = {
      found: true,
      
      // QR-Code Info
      qr_code: result.id,
      sequence_number: result.sequence_number,
      
      // Box ID
      box_id: box.id,
      
      // Box Nummer/Name
      number: box.number,
      display_number: box.number,
      name: box.name || null,
      
      // Box Status
      status: box.status,
      position_type: box.position_type,
      current_status: box.current_status,
      
      // WICHTIG: Object flach!
      object_id: box.object_id || null,
      object_name: box.objects?.name || null,
      
      // Box Type flach
      box_type_id: box.box_type_id || null,
      box_type_name: box.box_types?.name || null,
      
      // GPS Position
      lat: box.lat || null,
      lng: box.lng || null,
      
      // Floorplan Position
      floor_plan_id: box.floor_plan_id || null,
      pos_x: box.pos_x || null,
      pos_y: box.pos_y || null,
      grid_position: box.grid_position || null,
      
      // Sonstiges
      notes: box.notes || null,
      control_interval_days: box.control_interval_days || 30
    };

    console.log(`✅ Code gefunden: box_id=${response.box_id}, object_id=${response.object_id}, object_name=${response.object_name}`);
    
    res.json(response);
  } catch (err) {
    console.error("QR check error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/qr/codes - Alle Codes der Organisation
exports.getAll = async (req, res) => {
  try {
    const org = req.user.organisation_id;
    const codes = await qrService.getCodesByOrganisation(org);
    res.json(codes);
  } catch (err) {
    console.error("QR getAll error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/qr/codes/available - Freie Boxen im Pool
exports.getAvailable = async (req, res) => {
  try {
    const org = req.user.organisation_id;
    const boxes = await qrService.getAvailableCodes(org);
    res.json(boxes);
  } catch (err) {
    console.error("QR getAvailable error:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/qr/assign - QR Code einer Box zuweisen (Legacy)
exports.assign = async (req, res) => {
  try {
    const { code, box_id } = req.body;

    if (!code || !box_id) {
      return res.status(400).json({ error: "code und box_id erforderlich" });
    }

    await qrService.assignCode(code, box_id);
    res.json({ message: "QR linked successfully" });
  } catch (err) {
    console.error("QR assign error:", err);
    res.status(400).json({ error: err.message });
  }
};

// POST /api/qr/assign-object - Box einem Objekt zuweisen
exports.assignToObject = async (req, res) => {
  try {
    const { box_id, object_id } = req.body;
    const org = req.user.organisation_id;

    if (!box_id || !object_id) {
      return res.status(400).json({ error: "box_id und object_id erforderlich" });
    }

    console.log(`📦 assignToObject: box=${box_id}, object=${object_id}, org=${org}`);

    const result = await qrService.assignToObject(box_id, object_id, org);
    
    console.log(`✅ Box ${box_id} zu Objekt ${object_id} zugewiesen`);
    res.json(result);
  } catch (err) {
    console.error("QR assignToObject error:", err);
    res.status(400).json({ error: err.message });
  }
};

// POST /api/qr/return-to-pool - Box zurück in Pool
exports.returnToPool = async (req, res) => {
  try {
    const { box_id } = req.body;
    const org = req.user.organisation_id;

    if (!box_id) {
      return res.status(400).json({ error: "box_id erforderlich" });
    }

    const result = await qrService.returnToPool(box_id, org);
    res.json(result);
  } catch (err) {
    console.error("QR returnToPool error:", err);
    res.status(400).json({ error: err.message });
  }
};

// POST /api/qr/move - Box zu anderem Objekt verschieben
exports.moveToObject = async (req, res) => {
  try {
    const { box_id, object_id } = req.body;
    const org = req.user.organisation_id;

    if (!box_id || !object_id) {
      return res.status(400).json({ error: "box_id und object_id erforderlich" });
    }

    const result = await qrService.moveToObject(box_id, object_id, org);
    res.json(result);
  } catch (err) {
    console.error("QR moveToObject error:", err);
    res.status(400).json({ error: err.message });
  }
};