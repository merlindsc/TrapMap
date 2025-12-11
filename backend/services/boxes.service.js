// ============================================
// BOXES SERVICE - KOMPLETT MIT GRID_POSITION
// Alle CRUD Operationen + GPS + Scans + Lageplan
// ============================================

const { supabase } = require("../config/supabase");

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

  if (error) return { success: false, message: error.message };

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
// GET BOXES BY FLOOR PLAN
// ============================================
exports.getByFloorPlan = async (floorPlanId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .eq("floor_plan_id", floorPlanId)
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .order("number");

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// ============================================
// CREATE BOX (MIT GRID_POSITION)
// ============================================
exports.create = async (organisationId, payload) => {
  try {
    console.log("📦 Creating box:", payload);

    const boxData = {
      organisation_id: organisationId,
      object_id: parseInt(payload.object_id),
      number: payload.number,
      notes: payload.notes || null,
      box_type_id: payload.box_type_id ? parseInt(payload.box_type_id) : (payload.boxtype_id ? parseInt(payload.boxtype_id) : null),
      current_status: payload.current_status || "green",
      active: payload.active !== false,
      // Lageplan-Position
      floor_plan_id: payload.floor_plan_id ? parseInt(payload.floor_plan_id) : null,
      pos_x: payload.pos_x || null,
      pos_y: payload.pos_y || null,
      // Grid-Position (NEU!)
      grid_position: payload.grid_position || null,
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

    console.log("✅ Box erstellt:", data.id, data.number, "Grid:", data.grid_position);
    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in create:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// UPDATE BOX (MIT GRID_POSITION)
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
    if (payload.active !== undefined) updateData.active = payload.active;
    if (payload.floor_plan_id !== undefined) updateData.floor_plan_id = payload.floor_plan_id ? parseInt(payload.floor_plan_id) : null;
    if (payload.pos_x !== undefined) updateData.pos_x = payload.pos_x;
    if (payload.pos_y !== undefined) updateData.pos_y = payload.pos_y;
    // Grid-Position (NEU!)
    if (payload.grid_position !== undefined) updateData.grid_position = payload.grid_position;
    if (payload.lat !== undefined) updateData.lat = payload.lat;
    if (payload.lng !== undefined) updateData.lng = payload.lng;
    if (payload.control_interval_days !== undefined) updateData.control_interval_days = payload.control_interval_days;

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
// DELETE BOX (SOFT DELETE)
// ============================================
exports.remove = async (id, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// ============================================
// UPDATE STATUS (nach Scan)
// ============================================
exports.updateStatus = async (boxId, status) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      current_status: status,
      last_scan: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  console.log("✅ Box status updated to:", status);
  return { success: true, data };
};

// ============================================
// UPDATE POSITION (auf Lageplan)
// ============================================
exports.updatePosition = async (boxId, organisationId, posX, posY, floorPlanId = null) => {
  const updateData = {
    pos_x: posX,
    pos_y: posY,
    updated_at: new Date().toISOString()
  };

  if (floorPlanId) {
    updateData.floor_plan_id = floorPlanId;
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

// ============================================
// UPDATE GPS LOCATION
// ============================================
exports.updateGPS = async (boxId, organisationId, lat, lng) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      lat,
      lng,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// ============================================
// GET UNPLACED BOXES (für Objekt)
// ============================================
exports.getUnplaced = async (objectId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .select("*")
    .eq("object_id", objectId)
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .is("floor_plan_id", null)
    .order("number");

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// ============================================
// PLACE BOX ON FLOOR PLAN
// ============================================
exports.placeOnFloorPlan = async (boxId, organisationId, floorPlanId, posX, posY, gridPosition = null) => {
  const updateData = {
    floor_plan_id: floorPlanId,
    pos_x: posX,
    pos_y: posY,
    updated_at: new Date().toISOString()
  };

  if (gridPosition) {
    updateData.grid_position = gridPosition;
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

// ============================================
// REMOVE FROM FLOOR PLAN
// ============================================
exports.removeFromFloorPlan = async (boxId, organisationId) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      grid_position: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};