// ============================================
// BOXES SERVICE - KOMPLETT
// Alle CRUD Operationen + GPS + Scans + Lageplan + Pool
// ============================================

const { supabase } = require("../config/supabase");
const auditService = require("./audit.service");

// ============================================
// GET ALL BOXES
// ============================================
exports.getAll = async (organisationId, objectId = null) => {
  let query = supabase
    .from("boxes")
    .select(`
      *,
      box_types:box_type_id (
        id,
        name,
        category,
        border_color,
        requires_symbol
      )
    `)
    .eq("organisation_id", organisationId)
    .eq("active", true);

  if (objectId) query = query.eq("object_id", objectId);

  const { data, error } = await query.order("number", { ascending: true });
  if (error) return { success: false, message: error.message };

  const now = new Date();

  const enriched = data.map((box) => {
    const interval = box.control_interval_days || 30;
    const lastScan = box.last_scan
      ? new Date(box.last_scan)
      : new Date(box.created_at);

    const nextControl = new Date(lastScan.getTime() + interval * 86400000);
    const diffDays = Math.ceil((nextControl - now) / 86400000);

    let due_status = "green";
    if (diffDays <= 0) due_status = "red";
    else if (diffDays <= 5) due_status = "yellow";

    return {
      ...box,
      box_type_name: box.box_types?.name || null,
      box_type_category: box.box_types?.category || null,
      box_type_border: box.box_types?.border_color || null,
      requires_symbol: box.box_types?.requires_symbol || false,
      next_control: nextControl.toISOString(),
      due_in_days: diffDays,
      due_status
    };
  });

  return { success: true, data: enriched };
};

// ============================================
// GET ONE BOX
// ============================================
exports.getOne = async (id, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select(`
      *,
      box_types:box_type_id (
        id,
        name,
        category,
        border_color,
        requires_symbol
      )
    `)
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .single();

  if (error || !data) {
    return { success: false, message: "Box not found" };
  }

  return {
    success: true,
    data: {
      ...data,
      box_type_name: data.box_types?.name || null,
      box_type_category: data.box_types?.category || null,
      box_type_border: data.box_types?.border_color || null,
      requires_symbol: data.box_types?.requires_symbol || false
    }
  };
};

// ============================================
// CREATE BOX
// ============================================
exports.create = async (organisationId, payload) => {
  try {
    console.log("📦 Creating box:", payload);

    const boxData = {
      organisation_id: organisationId,
      object_id: payload.object_id ? parseInt(payload.object_id) : null,
      number: payload.number || null,
      notes: payload.notes || null,
      qr_code: payload.qr_code || null,
      box_type_id: payload.box_type_id ? parseInt(payload.box_type_id) : (payload.boxtype_id ? parseInt(payload.boxtype_id) : null),
      current_status: payload.current_status || "green",
      status: payload.status || (payload.object_id ? "assigned" : "pool"),
      position_type: payload.position_type || "none",
      active: payload.active !== false,
      // Lageplan-Position
      floor_plan_id: payload.floor_plan_id ? parseInt(payload.floor_plan_id) : null,
      pos_x: payload.pos_x || null,
      pos_y: payload.pos_y || null,
      // GPS-Position
      lat: payload.lat || null,
      lng: payload.lng || null,
      // Intervall
      control_interval_days: payload.control_interval_days || 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("boxes")
      .insert(boxData)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase ERROR (create box):", error);
      return { success: false, message: error.message };
    }

    console.log("✅ Box erstellt:", data.id, data.number);
    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in create:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// UPDATE BOX
// ============================================
exports.update = async (id, organisationId, payload) => {
  try {
    console.log("📦 Updating box:", id, payload);

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Nur gesetzte Felder updaten
    if (payload.number !== undefined) updateData.number = payload.number;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.boxtype_id !== undefined) updateData.box_type_id = payload.boxtype_id ? parseInt(payload.boxtype_id) : null;
    if (payload.box_type_id !== undefined) updateData.box_type_id = payload.box_type_id ? parseInt(payload.box_type_id) : null;
    if (payload.current_status !== undefined) updateData.current_status = payload.current_status;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.position_type !== undefined) updateData.position_type = payload.position_type;
    if (payload.active !== undefined) updateData.active = payload.active;
    if (payload.floor_plan_id !== undefined) updateData.floor_plan_id = payload.floor_plan_id ? parseInt(payload.floor_plan_id) : null;
    if (payload.pos_x !== undefined) updateData.pos_x = payload.pos_x;
    if (payload.pos_y !== undefined) updateData.pos_y = payload.pos_y;
    if (payload.lat !== undefined) updateData.lat = payload.lat;
    if (payload.lng !== undefined) updateData.lng = payload.lng;
    if (payload.control_interval_days !== undefined) updateData.control_interval_days = payload.control_interval_days;
    if (payload.bait !== undefined) updateData.bait = payload.bait;  // Köder für Köderstationen

    const { data, error } = await supabase
      .from("boxes")
      .update(updateData)
      .eq("id", id)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase ERROR (update box):", error);
      return { success: false, message: error.message };
    }

    console.log("✅ Box aktualisiert:", data.id);
    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in update:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// UPDATE LOCATION (GPS)
// ============================================
exports.updateLocation = async (id, organisationId, lat, lng, userId = null, method = "manual") => {
  // Alte Werte holen für Audit
  const { data: oldBox } = await supabase
    .from("boxes")
    .select("lat, lng")
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .single();

  const { data, error } = await supabase
    .from("boxes")
    .update({
      lat,
      lng,
      position_type: "gps",
      status: "placed",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  // Audit loggen
  if (oldBox) {
    await auditService.logBoxMoved(
      id, 
      organisationId, 
      userId, 
      oldBox.lat, 
      oldBox.lng, 
      lat, 
      lng,
      method
    );
  }

  return { success: true, data };
};

// ============================================
// UNDO LOCATION (GPS zurücksetzen)
// ============================================
exports.undoLocation = async (id, organisationId) => {
  const { data: box } = await supabase
    .from("boxes")
    .select(`
      object_id,
      objects:object_id (lat, lng)
    `)
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .single();

  if (!box || !box.objects) {
    return { success: false, message: "Box or Object not found" };
  }

  const { data, error } = await supabase
    .from("boxes")
    .update({
      lat: box.objects.lat,
      lng: box.objects.lng,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// ============================================
// DELETE BOX (Soft Delete)
// ============================================
exports.remove = async (id, organisationId) => {
  const { error } = await supabase
    .from("boxes")
    .update({
      active: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (error) return { success: false, message: error.message };
  return { success: true };
};

// ============================================
// GET SCANS (Historie)
// ============================================
exports.getScans = async (boxId, organisationId, days = 90) => {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await supabase
    .from("scans")
    .select(`
      id,
      status,
      notes,
      findings,
      photo_url,
      pest_found,
      pest_count,
      scanned_at,
      created_at,
      users:user_id (
        id,
        first_name,
        last_name
      )
    `)
    .eq("box_id", boxId)
    .eq("organisation_id", organisationId)
    .gte("scanned_at", since)
    .order("scanned_at", { ascending: false });

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// ============================================
// BOX-POOL FUNKTIONEN (NEU!)
// ============================================

// Alle Boxen im Pool (ohne Objekt)
exports.getPoolBoxes = async (organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select(`
      id, qr_code, number, status, position_type, current_status, created_at,
      box_types:box_type_id (id, name)
    `)
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .is("object_id", null)
    .order("created_at", { ascending: true });

  if (error) return { success: false, message: error.message };
  return { success: true, data: data || [] };
};

// Unplatzierte Boxen eines Objekts
exports.getUnplacedByObject = async (objectId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select(`
      id, qr_code, number, status, position_type, current_status,
      box_types:box_type_id (id, name)
    `)
    .eq("organisation_id", organisationId)
    .eq("object_id", objectId)
    .eq("active", true)
    .or("position_type.eq.none,position_type.is.null")
    .order("created_at", { ascending: true });

  if (error) return { success: false, message: error.message };
  return { success: true, data: data || [] };
};

// Box einem Objekt zuweisen (aus Pool)
exports.assignToObject = async (boxId, objectId, organisationId) => {
  const { data: obj } = await supabase
    .from("objects")
    .select("id, name")
    .eq("id", objectId)
    .eq("organisation_id", organisationId)
    .single();

  if (!obj) {
    return { success: false, message: "Objekt nicht gefunden" };
  }

  const { data, error } = await supabase
    .from("boxes")
    .update({
      object_id: objectId,
      status: "assigned",
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// Box zurück in Pool
exports.returnToPool = async (boxId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      object_id: null,
      status: "pool",
      position_type: "none",
      lat: null,
      lng: null,
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// Box auf GPS platzieren
exports.placeOnMap = async (boxId, organisationId, lat, lng, boxTypeId = null, objectId = null, userId = null) => {
  // Alte Werte holen für Audit
  const { data: oldBox } = await supabase
    .from("boxes")
    .select("lat, lng, object_id, box_type_id, status")
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .single();

  const updateData = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    position_type: "gps",
    status: "placed",
    floor_plan_id: null,
    pos_x: null,
    pos_y: null,
    updated_at: new Date().toISOString()
  };

  if (boxTypeId) {
    updateData.box_type_id = parseInt(boxTypeId);
  }

  // Objekt-ID setzen wenn vorhanden (für Drag & Drop aus Pool)
  if (objectId) {
    updateData.object_id = parseInt(objectId);
  }

  const { data, error } = await supabase
    .from("boxes")
    .update(updateData)
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  // Audit loggen
  if (oldBox) {
    await auditService.logBoxMoved(
      boxId, 
      organisationId, 
      userId, 
      oldBox.lat, 
      oldBox.lng, 
      parseFloat(lat), 
      parseFloat(lng),
      "manual"
    );
  }

  return { success: true, data };
};

// Box auf Lageplan platzieren
exports.placeOnFloorPlan = async (boxId, organisationId, floorPlanId, posX, posY, boxTypeId = null) => {
  const updateData = {
    floor_plan_id: parseInt(floorPlanId),
    pos_x: parseFloat(posX),
    pos_y: parseFloat(posY),
    position_type: "floorplan",
    status: "placed",
    lat: null,
    lng: null,
    updated_at: new Date().toISOString()
  };

  if (boxTypeId) {
    updateData.box_type_id = parseInt(boxTypeId);
  }

  const { data, error } = await supabase
    .from("boxes")
    .update(updateData)
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// Box zu anderem Objekt verschieben
exports.moveToObject = async (boxId, newObjectId, organisationId) => {
  const { data: obj } = await supabase
    .from("objects")
    .select("id, name")
    .eq("id", newObjectId)
    .eq("organisation_id", organisationId)
    .single();

  if (!obj) {
    return { success: false, message: "Ziel-Objekt nicht gefunden" };
  }

  const { data, error } = await supabase
    .from("boxes")
    .update({
      object_id: newObjectId,
      status: "assigned",
      position_type: "none",
      lat: null,
      lng: null,
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};