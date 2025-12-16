// ============================================
// BOXES CONTROLLER - KOMPLETT
// Inkl. Pool-Funktionen und userId für Audit
// ============================================

const boxesService = require("../services/boxes.service");

// ============================================
// GET ALL BOXES
// ============================================
exports.getAll = async (req, res) => {
  try {
    const objectId = req.query.object_id || null;
    const result = await boxesService.getAll(req.user.organisation_id, objectId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getAll error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET ONE BOX
// ============================================
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

// ============================================
// UPDATE BOX
// ============================================
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

// ============================================
// DELETE BOX (Soft Delete)
// ============================================
exports.remove = async (req, res) => {
  try {
    const result = await boxesService.remove(req.params.id, req.user.organisation_id);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({ success: true });
  } catch (err) {
    console.error("delete box error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// UPDATE LOCATION (GPS)
// ============================================
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, method } = req.body;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "lat und lng erforderlich" });
    }

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
      req.user.id,
      method || "manual"
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

// ============================================
// UNDO LOCATION (GPS zurücksetzen)
// ============================================
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

// ============================================
// GET SCANS (Historie)
// ============================================
exports.getScans = async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 90;
    const result = await boxesService.getScans(
      req.params.id,
      req.user.organisation_id,
      days
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getScans error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET POOL BOXES
// ============================================
exports.getPool = async (req, res) => {
  try {
    const result = await boxesService.getPoolBoxes(req.user.organisation_id);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getPool error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET UNPLACED BOXES
// ============================================
exports.getUnplaced = async (req, res) => {
  try {
    const result = await boxesService.getUnplacedByObject(
      req.params.objectId,
      req.user.organisation_id
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("getUnplaced error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// ASSIGN TO OBJECT
// ============================================
exports.assignToObject = async (req, res) => {
  try {
    const { object_id } = req.body;
    
    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    const result = await boxesService.assignToObject(
      req.params.id,
      object_id,
      req.user.organisation_id,
      req.user.id  // userId für Audit
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

// ============================================
// RETURN TO POOL - VOLLSTÄNDIGER RESET!
// ============================================
exports.returnToPool = async (req, res) => {
  try {
    const result = await boxesService.returnToPool(
      req.params.id,
      req.user.organisation_id,
      req.user.id  // userId für Audit
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log(`✅ Box ${req.params.id} ins Lager zurückgesendet von User ${req.user.id}`);
    return res.json(result.data);
  } catch (err) {
    console.error("returnToPool error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// UNASSIGN FROM OBJECT (Alias für returnToPool)
// ============================================
exports.unassignFromObject = async (req, res) => {
  try {
    const result = await boxesService.returnToPool(
      req.params.id,
      req.user.organisation_id,
      req.user.id  // userId für Audit
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

// ============================================
// PLACE ON MAP (GPS)
// ============================================
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

// ============================================
// PLACE ON FLOOR PLAN
// ============================================
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

// ============================================
// UNPLACE (von Karte/Lageplan entfernen)
// ============================================
exports.unplace = async (req, res) => {
  try {
    const result = await boxesService.returnToPool(
      req.params.id, 
      req.user.organisation_id,
      req.user.id  // userId für Audit
    );
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json(result.data);
  } catch (err) {
    console.error("unplace error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// MOVE TO OBJECT
// ============================================
exports.moveToObject = async (req, res) => {
  try {
    const { target_object_id } = req.body;
    
    if (!target_object_id) {
      return res.status(400).json({ error: "target_object_id erforderlich" });
    }

    const result = await boxesService.moveToObject(
      req.params.id,
      target_object_id,
      req.user.organisation_id,
      req.user.id  // userId für Audit
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