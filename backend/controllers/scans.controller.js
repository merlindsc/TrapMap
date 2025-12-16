// ============================================
// SCANS CONTROLLER
// Funktionsnamen passend zu scans.routes.js:
// - getHistory
// - getBoxHistory  
// - create
// ============================================

const scansService = require("../services/scans.service");
const { supabase } = require("../config/supabase");

// ============================================
// GET /api/scans - Scan-History abrufen
// ============================================
exports.getHistory = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const result = await scansService.getRecent(req.user.organisation_id, limit);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getHistory error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET /api/scans/box/:boxId - History für eine Box
// ============================================
exports.getBoxHistory = async (req, res) => {
  try {
    const result = await scansService.getHistoryForBox(
      req.params.boxId,
      req.user.organisation_id
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getBoxHistory error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// POST /api/scans - Neuen Scan erstellen
// Mit Foto-Upload und update_gps Flag
// ============================================
exports.create = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = req.user.id;

    console.log("📸 Scan request received");
    console.log("Body:", req.body);
    console.log("File:", req.file ? req.file.originalname : "No file");

    // Foto hochladen wenn vorhanden
    let photoUrl = null;
    if (req.file) {
      try {
        const timestamp = Date.now();
        const ext = req.file.originalname.split('.').pop();
        const uniqueName = `${orgId}/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { data, error } = await supabase.storage
          .from("scans")
          .upload(uniqueName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (error) {
          console.error("📷 Supabase Storage Error:", error);
          // Nicht abbrechen - Scan wird ohne Foto erstellt
        } else {
          const { data: urlData } = supabase.storage
            .from("scans")
            .getPublicUrl(uniqueName);
          
          photoUrl = urlData.publicUrl;
          console.log(`📷 Scan-Foto hochgeladen: ${photoUrl}`);
        }
      } catch (uploadErr) {
        console.error("📷 Upload Error:", uploadErr);
      }
    }

    // ============================================
    // update_gps Flag parsen
    // FormData schickt strings, also 'true' prüfen
    // ============================================
    const updateGps = req.body.update_gps === 'true' || req.body.update_gps === true;
    
    if (req.body.latitude && req.body.longitude) {
      console.log(`📍 GPS in Request: ${req.body.latitude}, ${req.body.longitude}`);
      console.log(`📍 update_gps Flag: ${updateGps}`);
    }

    // Scan-Daten aus Body
    const scanData = {
      box_id: req.body.box_id,
      user_id: userId,
      status: req.body.status,
      notes: req.body.notes || null,
      findings: req.body.findings || null,
      consumption: req.body.consumption || null,
      quantity: req.body.quantity || null,
      trap_state: req.body.trap_state || null,
      photo_url: photoUrl,
      // GPS-Daten
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      // WICHTIG: update_gps Flag für Service
      update_gps: updateGps
    };

    console.log("📝 Creating scan with data:", {
      ...scanData,
      photo_url: photoUrl ? '[uploaded]' : null
    });

    const result = await scansService.create(scanData, orgId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log("✅ Scan created:", result.data.id);
    return res.status(201).json(result.data);
  } catch (err) {
    console.error("❌ Scan create error:", err);
    return res.status(500).json({ error: err.message });
  }
};