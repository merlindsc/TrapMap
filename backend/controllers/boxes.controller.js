// ============================================
// BOXES CONTROLLER - KOMPLETT V2
// Inkl. Pool-Funktionen, Bulk-Return, Archivierung
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

// Alias für PUT /position
exports.updatePosition = exports.updateLocation;

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
      req.user.id
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
// BULK ASSIGN TO OBJECT - MEHRERE BOXEN
// ============================================
exports.bulkAssignToObject = async (req, res) => {
  try {
    const { box_ids, qr_codes, object_id } = req.body;
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log("📦 Bulk assign request:", { 
        box_ids_count: box_ids?.length, 
        qr_codes_count: qr_codes?.length, 
        object_id,
        box_ids_sample: box_ids?.slice(0, 3),
        qr_codes_sample: qr_codes?.slice(0, 3)
      });
    }
    
    // Accept either box_ids (legacy) or qr_codes (new, preferred)
    const identifiers = qr_codes || box_ids;
    const useQrCodes = !!qr_codes;
    
    if (!identifiers || !Array.isArray(identifiers) || identifiers.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("❌ Keine gültigen Identifikatoren:", { 
          has_box_ids: !!box_ids, 
          has_qr_codes: !!qr_codes 
        });
      }
      return res.status(400).json({ 
        error: "qr_codes oder box_ids Array erforderlich",
        debug: process.env.NODE_ENV !== 'production' ? {
          received_box_ids: box_ids,
          received_qr_codes: qr_codes,
          received_object_id: object_id
        } : undefined
      });
    }

    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    if (identifiers.length > 100) {
      return res.status(400).json({ error: "Maximal 100 Boxen auf einmal" });
    }

    const result = await boxesService.bulkAssignToObject(
      identifiers,
      object_id,
      req.user.organisation_id,
      req.user.id,
      useQrCodes
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log(`✅ ${result.count} Boxen zu Objekt ${object_id} zugewiesen von User ${req.user.id}`);
    return res.json({ 
      success: true, 
      count: result.count,
      skipped: result.skipped || 0,
      data: result.data
    });
  } catch (err) {
    console.error("bulkAssignToObject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// RETURN TO POOL - EINZELNE BOX
// ============================================
exports.returnToPool = async (req, res) => {
  try {
    const result = await boxesService.returnToPool(
      req.params.id,
      req.user.organisation_id,
      req.user.id
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
// BULK RETURN TO POOL - MEHRERE BOXEN
// ============================================
exports.bulkReturnToPool = async (req, res) => {
  try {
    const { box_ids } = req.body;
    
    if (!box_ids || !Array.isArray(box_ids) || box_ids.length === 0) {
      return res.status(400).json({ error: "box_ids Array erforderlich" });
    }

    if (box_ids.length > 100) {
      return res.status(400).json({ error: "Maximal 100 Boxen auf einmal" });
    }

    const result = await boxesService.bulkReturnToPool(
      box_ids,
      req.user.organisation_id,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log(`✅ ${result.count} Boxen ins Lager zurückgesendet von User ${req.user.id}`);
    return res.json({ 
      success: true, 
      count: result.count,
      data: result.data
    });
  } catch (err) {
    console.error("bulkReturnToPool error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// ARCHIVE OBJECT BOXES - Alle Boxen eines Objekts ins Lager
// ============================================
exports.archiveObjectBoxes = async (req, res) => {
  try {
    const { object_id } = req.body;
    
    if (!object_id) {
      return res.status(400).json({ error: "object_id erforderlich" });
    }

    const result = await boxesService.archiveObjectBoxes(
      object_id,
      req.user.organisation_id,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log(`✅ ${result.count} Boxen von Objekt ${object_id} ins Lager - User ${req.user.id}`);
    return res.json({ 
      success: true, 
      count: result.count,
      message: `${result.count} Boxen zurück ins Lager`
    });
  } catch (err) {
    console.error("archiveObjectBoxes error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// UNASSIGN FROM OBJECT (Alias für returnToPool)
// ============================================
exports.unassignFromObject = exports.returnToPool;

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
      req.user.id
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
exports.unplace = exports.returnToPool;

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
      req.user.id
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

// ============================================
// RENUMBER OBJECT BOXES
// ============================================
exports.renumberObject = async (req, res) => {
  try {
    const result = await boxesService.renumberObject(
      req.params.objectId,
      req.user.organisation_id,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("renumberObject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// RENUMBER ALL BOXES
// ============================================
exports.renumberAll = async (req, res) => {
  try {
    const result = await boxesService.renumberAll(
      req.user.organisation_id,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("renumberAll error:", err);
    res.status(500).json({ error: "Server error" });
  }
};