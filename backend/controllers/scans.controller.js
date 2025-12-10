const scansService = require("../services/scans.service");
const { supabase } = require("../config/supabase");

// GET /api/scans?box_id=...
exports.getHistory = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { box_id, object_id } = req.query;

    if (box_id) {
      const result = await scansService.getHistoryForBox(box_id, orgId);
      if (!result.success) return res.status(500).json({ error: result.message });
      return res.json(result.data);
    }

    if (object_id) {
      const result = await scansService.getHistoryForObject(object_id, orgId);
      if (!result.success) return res.status(500).json({ error: result.message });
      return res.json(result.data);
    }

    return res.status(400).json({ error: "box_id or object_id required" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/scans/box/:boxId - History für eine Box
exports.getBoxHistory = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const { boxId } = req.params;

    const result = await scansService.getHistoryForBox(boxId, orgId);
    if (!result.success) return res.status(500).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/scans
exports.create = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = req.user.id;
    
    let photoUrl = null;

    // Foto zu Supabase Storage hochladen wenn vorhanden
    if (req.file) {
      try {
        const uniqueName = `${orgId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${req.file.originalname.split('.').pop()}`;
        
        const { data, error } = await supabase.storage
          .from("scans")
          .upload(uniqueName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (error) {
          console.error("📷 Supabase Storage Error:", error);
          // Nicht abbrechen, nur loggen - Scan wird ohne Foto erstellt
        } else {
          const { data: urlData } = supabase.storage
            .from("scans")
            .getPublicUrl(uniqueName);
          
          photoUrl = urlData.publicUrl;
          console.log(`📷 Scan-Foto hochgeladen: ${photoUrl}`);
        }
      } catch (uploadErr) {
        console.error("📷 Upload Error:", uploadErr);
        // Weitermachen ohne Foto
      }
    }

    // Scan-Daten aus Body (FormData oder JSON)
    const scanData = {
      box_id: req.body.box_id,
      user_id: userId,
      status: req.body.status,
      notes: req.body.notes || null,
      findings: req.body.findings || null,
      consumption: req.body.consumption || null,
      quantity: req.body.quantity || null,
      trap_state: req.body.trap_state || null,
      photo_url: photoUrl
    };

    console.log("📝 Creating scan:", scanData);

    const result = await scansService.create(scanData, orgId);
    if (!result.success) return res.status(400).json({ error: result.message });

    return res.status(201).json(result.data);
  } catch (err) {
    console.error("❌ Scan create error:", err);
    return res.status(500).json({ error: err.message });
  }
};