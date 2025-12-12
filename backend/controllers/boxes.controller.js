// ============================================
// BOXES CONTROLLER
// Mit Audit-Support für alle Änderungen
// ============================================

const boxesService = require("../services/boxes.service");
const { supabase } = require("../config/supabase");

// GET /api/boxes
exports.getAll = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const objectId = req.query.object_id || null;
    
    const result = await boxesService.getAll(orgId, objectId);
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("getAll boxes error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/boxes/:id
exports.getById = async (req, res) => {
  try {
    const result = await boxesService.getOne(req.params.id, req.user.organisation_id);
    if (!result.success) return res.status(404).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("getById box error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes - DISABLED (nur via QR-Bestellsystem)
// exports.create = async (req, res) => { ... };

// PATCH /api/boxes/:id
exports.update = async (req, res) => {
  try {
    const result = await boxesService.update(
      req.params.id, 
      req.user.organisation_id,
      req.body
    );
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("update box error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/boxes/:id
exports.delete = async (req, res) => {
  try {
    const result = await boxesService.remove(
      req.params.id, 
      req.user.organisation_id
    );
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json({ success: true });
  } catch (err) {
    console.error("delete box error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/boxes/:id/location - GPS Position ändern
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, method } = req.body;
    
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
      lngNum,
      req.user.id,        // userId für Audit
      method || "manual"  // 'manual' oder 'gps'
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
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("undoLocation error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/:id/place-map - Box auf Karte platzieren (Drag & Drop)
exports.placeOnMap = async (req, res) => {
  try {
    const { lat, lng, box_type_id, object_id } = req.body;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "lat und lng erforderlich" });
    }

    const result = await boxesService.placeOnMap(
      req.params.id,
      req.user.organisation_id,
      lat,
      lng,
      box_type_id || null,
      object_id || null,
      req.user.id  // userId für Audit
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    console.error("placeOnMap error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/:id/place-floorplan - Box auf Lageplan platzieren
exports.placeOnFloorPlan = async (req, res) => {
  try {
    const { floor_plan_id, pos_x, pos_y, box_type_id } = req.body;
    
    if (!floor_plan_id || pos_x === undefined || pos_y === undefined) {
      return res.status(400).json({ error: "floor_plan_id, pos_x und pos_y erforderlich" });
    }

    const result = await boxesService.placeOnFloorPlan(
      req.params.id,
      req.user.organisation_id,
      floor_plan_id,
      pos_x,
      pos_y,
      box_type_id || null
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    console.error("placeOnFloorPlan error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/:id/unplace - Box von Karte/Lageplan entfernen
exports.unplace = async (req, res) => {
  try {
    const result = await boxesService.returnToPool(
      req.params.id, 
      req.user.organisation_id
    );
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("unplace error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/:id/move - Box zu anderem Objekt verschieben
exports.moveToObject = async (req, res) => {
  try {
    const { target_object_id } = req.body;
    
    if (!target_object_id) {
      return res.status(400).json({ error: "target_object_id erforderlich" });
    }

    const result = await boxesService.moveToObject(
      req.params.id,
      target_object_id,
      req.user.organisation_id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    console.error("moveToObject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/boxes/pool - Verfügbare Boxen im Pool
exports.getPool = async (req, res) => {
  try {
    const result = await boxesService.getPoolBoxes(req.user.organisation_id);
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("getPool error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/:id/assign - Box einem Objekt zuweisen
exports.assignToObject = async (req, res) => {
  try {
    const { object_id } = req.body;
    
    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    const result = await boxesService.assignToObject(
      req.params.id,
      object_id,
      req.user.organisation_id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    console.error("assignToObject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/:id/unassign - Box von Objekt lösen
exports.unassignFromObject = async (req, res) => {
  try {
    const result = await boxesService.returnToPool(
      req.params.id,
      req.user.organisation_id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    console.error("unassignFromObject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};