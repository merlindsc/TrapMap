// ============================================
// BOXES SERVICE - KOMPLETT
// Alle CRUD Operationen + GPS + Scans
// ============================================

const { supabase } = require("../config/supabase");

// ============================================
// GET ALL BOXES (MIT TYPE-MAPPING)
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

  const enriched = (data || []).map((box) => {
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
// GET ONE BOX (MIT TYPE-MAPPING)
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
// CREATE BOX (MIT AUTO-NUMMER)
// ============================================
exports.create = async (organisationId, boxData) => {
  // Auto-Nummer: Höchste Nummer für dieses Object finden
  let nextNumber = 1;
  
  if (boxData.object_id) {
    const { data: existingBoxes } = await supabase
      .from("boxes")
      .select("number")
      .eq("organisation_id", organisationId)
      .eq("object_id", boxData.object_id)
      .order("number", { ascending: false })
      .limit(1);

    if (existingBoxes && existingBoxes.length > 0 && existingBoxes[0].number) {
      nextNumber = existingBoxes[0].number + 1;
    }
  }

  // Nur Felder die in der DB existieren
  const insertData = {
    organisation_id: organisationId,
    object_id: boxData.object_id || null,
    box_type_id: boxData.box_type_id || null,
    number: boxData.number || nextNumber,
    box_name: boxData.box_name || `Box ${nextNumber}`,
    lat: boxData.lat || null,
    lng: boxData.lng || null,
    notes: boxData.notes || null,
    control_interval_days: boxData.control_interval_days || 30,
    current_status: boxData.current_status || "green",
    active: true
  };

  const { data, error } = await supabase
    .from("boxes")
    .insert(insertData)
    .select(`
      *,
      box_types:box_type_id (
        id,
        name,
        category
      )
    `)
    .single();

  if (error) {
    console.error("Box create error:", error);
    return { success: false, message: error.message };
  }

  console.log(`📦 Box created: ${data.box_name} (ID: ${data.id})`);
  return { success: true, data };
};

// ============================================
// UPDATE BOX
// ============================================
exports.update = async (id, organisationId, updateData) => {
  // Nur erlaubte Felder updaten (ohne floor/room)
  const allowedFields = [
    "box_name", "box_type_id", "number", "notes", 
    "control_interval_days", "current_status", "active", "lat", "lng"
  ];

  const cleanData = {};
  for (const key of allowedFields) {
    if (updateData[key] !== undefined) {
      cleanData[key] = updateData[key];
    }
  }

  const { data, error } = await supabase
    .from("boxes")
    .update(cleanData)
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select(`
      *,
      box_types:box_type_id (
        id,
        name,
        category
      )
    `)
    .single();

  if (error) {
    console.error("Box update error:", error);
    return { success: false, message: error.message };
  }

  console.log(`📦 Box updated: ${data.box_name} (ID: ${data.id})`);
  return { success: true, data };
};

// ============================================
// UPDATE LOCATION (GPS Verschieben)
// ============================================
exports.updateLocation = async (id, organisationId, lat, lng) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({ 
      lat: lat,
      lng: lng
    })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) {
    console.error("Update location error:", error);
    return { success: false, message: error.message };
  }

  console.log(`📍 Box ${id} relocated to: ${lat}, ${lng}`);
  return { success: true, data };
};

// ============================================
// UNDO LOCATION (GPS zurücksetzen)
// ============================================
exports.undoLocation = async (id, organisationId) => {
  // Hole ursprüngliche Position vom Object
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

  // Setze auf Object-Position zurück
  const { data, error } = await supabase
    .from("boxes")
    .update({
      lat: box.objects.lat,
      lng: box.objects.lng
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
    .update({ active: false })
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (error) return { success: false, message: error.message };

  console.log(`🗑️ Box ${id} deactivated`);
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
      consumption,
      quantity,
      trap_state,
      photo_url,
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

  return { success: true, data: data || [] };
};