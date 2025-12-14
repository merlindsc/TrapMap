// ============================================
// BOXES CONTROLLER
// Mit Audit-Support für alle Änderungen
// Mit Re-Nummerierung
// Mit updatePosition für GPS-Setzen vom Scanner
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

// Alias für Routes die getOne erwarten
exports.getOne = exports.getById;

// GET /api/boxes/unplaced/:objectId - Unplatzierte Boxen eines Objekts
exports.getUnplaced = async (req, res) => {
  try {
    const result = await boxesService.getUnplacedByObject(
      req.params.objectId, 
      req.user.organisation_id
    );
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("getUnplaced error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/boxes/:id/scans - Scan-Historie einer Box
exports.getScans = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    
    const result = await boxesService.getScans(
      req.params.id, 
      req.user.organisation_id,
      days
    );
    if (!result.success) return res.status(400).json({ error: result.message });
    
    return res.json(result.data);
  } catch (err) {
    console.error("getScans error:", err);
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

// Alias für Routes die remove erwarten
exports.remove = exports.delete;

// ============================================
// PUT /api/boxes/:id/position - GPS Position setzen (NEU!)
// Wird vom Scanner auf Mobile verwendet
// WICHTIG: Löscht Lageplan-Daten wenn GPS gesetzt wird!
// ============================================
exports.updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, position_type = 'gps' } = req.body;
    const orgId = req.user.organisation_id;

    // Validierung
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ 
        error: "lat und lng sind erforderlich" 
      });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ 
        error: "lat und lng müssen gültige Zahlen sein" 
      });
    }

    // Koordinaten-Bereich prüfen
    if (latNum < -90 || latNum > 90) {
      return res.status(400).json({ error: "lat muss zwischen -90 und 90 liegen" });
    }
    if (lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: "lng muss zwischen -180 und 180 liegen" });
    }

    // Box prüfen
    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .select("id, organisation_id, position_type, floor_plan_id")
      .eq("id", parseInt(id))
      .single();

    if (boxError || !box) {
      return res.status(404).json({ error: "Box nicht gefunden" });
    }

    if (box.organisation_id !== orgId) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }

    // Update-Daten zusammenstellen
    const updateData = {
      lat: latNum,
      lng: lngNum,
      position_type: position_type,
      updated_at: new Date().toISOString()
    };

    // WICHTIG: Wenn GPS gesetzt wird, Lageplan-Daten löschen!
    // Eine Box kann ENTWEDER GPS ODER Lageplan haben, nie beides!
    if (position_type === 'gps' || position_type === 'map') {
      updateData.floor_plan_id = null;
      updateData.pos_x = null;
      updateData.pos_y = null;
      updateData.grid_position = null;
    }

    // Update durchführen
    const { data: updated, error: updateError } = await supabase
      .from("boxes")
      .update(updateData)
      .eq("id", parseInt(id))
      .eq("organisation_id", orgId)
      .select(`
        *,
        box_types (id, name, category),
        objects (id, name)
      `)
      .single();

    if (updateError) {
      console.error("❌ Box position update error:", updateError);
      return res.status(500).json({ 
        error: "Position konnte nicht aktualisiert werden",
        details: updateError.message
      });
    }

    console.log(`✅ Box ${id} Position aktualisiert: ${latNum}, ${lngNum} (${position_type})`);

    res.json({
      success: true,
      box: updated
    });

  } catch (err) {
    console.error("❌ updatePosition error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
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

// POST /api/boxes/:id/return-to-pool - Alias für returnToPool Route
exports.returnToPool = exports.unassignFromObject;

// ============================================
// RE-NUMMERIERUNG
// ============================================

// POST /api/boxes/renumber/:objectId - Boxen eines Objekts neu nummerieren
exports.renumberObject = async (req, res) => {
  try {
    const result = await boxesService.renumberBoxesForObject(
      req.params.objectId,
      req.user.organisation_id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({
      success: true,
      message: `${result.data?.length || 0} von ${result.total || 0} Boxen neu nummeriert`,
      updated: result.data
    });
  } catch (err) {
    console.error("renumberObject error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/boxes/renumber-all - ALLE Boxen der Organisation neu nummerieren
exports.renumberAll = async (req, res) => {
  try {
    // Nur für Admins
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Nur Admins können alle Boxen neu nummerieren" });
    }

    const result = await boxesService.renumberAllBoxes(req.user.organisation_id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({
      success: true,
      message: "Alle Boxen wurden neu nummeriert",
      objects: result.data
    });
  } catch (err) {
    console.error("renumberAll error:", err);
    res.status(500).json({ error: "Server error" });
  }
};