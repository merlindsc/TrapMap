// ============================================
// BOXES CONTROLLER - KOMPLETT
// ============================================

const boxesService = require("../services/boxes.service");

// GET /api/boxes - Alle Boxen
exports.getAll = async (req, res) => {
  try {
    const result = await boxesService.getAll(
      req.user.organisation_id,
      req.query.object_id || null
    );

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getAll error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/boxes/:id - Einzelne Box
exports.getOne = async (req, res) => {
  try {
    const result = await boxesService.getOne(req.params.id, req.user.organisation_id);
    
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getOne error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes - Box erstellen
exports.create = async (req, res) => {
  try {
    const result = await boxesService.create(req.user.organisation_id, req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.status(201).json(result.data);
  } catch (err) {
    console.error("create error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/boxes/:id - Box aktualisieren
exports.update = async (req, res) => {
  try {
    const result = await boxesService.update(
      req.params.id, 
      req.user.organisation_id, 
      req.body
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("update error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/boxes/:id/location - GPS Position ändern
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "lat und lng erforderlich" });
    }

    // Konvertiere zu Number falls String
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: "lat und lng müssen Zahlen sein" });
    }

    const result = await boxesService.updateLocation(
      req.params.id, 
      req.user.organisation_id, 
      latNum, 
      lngNum
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ success: true, lat: latNum, lng: lngNum });
  } catch (err) {
    console.error("updateLocation error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/boxes/:id/undo-location - GPS zurücksetzen
exports.undoLocation = async (req, res) => {
  try {
    const result = await boxesService.undoLocation(
      req.params.id, 
      req.user.organisation_id
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("undoLocation error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/boxes/:id - Box löschen (soft delete)
exports.remove = async (req, res) => {
  try {
    const result = await boxesService.remove(req.params.id, req.user.organisation_id);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("remove error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/boxes/:id/scans - Scan-Historie
exports.getScans = async (req, res) => {
  try {
    const days = Number(req.query.days) || 90;
    const result = await boxesService.getScans(
      req.params.id, 
      req.user.organisation_id, 
      days
    );

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }
    
    return res.json({ scans: result.data });
  } catch (err) {
    console.error("getScans error:", err);
    res.status(500).json({ error: "Server error" });
  }
};