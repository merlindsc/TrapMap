// ============================================
// BOXES SERVICE - KOMPLETT
// Alle CRUD Operationen + GPS + Scans + QR-Codes
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
      object_id: parseInt(payload.object_id),
      number: payload.number,
      notes: payload.notes || null,
      box_type_id: payload.box_type_id ? parseInt(payload.box_type_id) : (payload.boxtype_id ? parseInt(payload.boxtype_id) : null),
      current_status: payload.current_status || "green",
      active: payload.active !== false,
      floor_plan_id: payload.floor_plan_id ? parseInt(payload.floor_plan_id) : null,
      pos_x: payload.pos_x || null,
      pos_y: payload.pos_y || null,
      lat: payload.lat || null,
      lng: payload.lng || null,
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

    if (payload.number !== undefined) updateData.number = payload.number;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.boxtype_id !== undefined) updateData.box_type_id = payload.boxtype_id ? parseInt(payload.boxtype_id) : null;
    if (payload.box_type_id !== undefined) updateData.box_type_id = payload.box_type_id ? parseInt(payload.box_type_id) : null;
    if (payload.current_status !== undefined) updateData.current_status = payload.current_status;
    if (payload.active !== undefined) updateData.active = payload.active;
    if (payload.floor_plan_id !== undefined) updateData.floor_plan_id = payload.floor_plan_id ? parseInt(payload.floor_plan_id) : null;
    if (payload.pos_x !== undefined) updateData.pos_x = payload.pos_x;
    if (payload.pos_y !== undefined) updateData.pos_y = payload.pos_y;
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
// UPDATE LOCATION (GPS)
// ============================================
exports.updateLocation = async (id, organisationId, lat, lng) => {
  const { data, error } = await supabase
    .from("boxes")
    .update({
      lat,
      lng,
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
// ERWEITERUNGEN - Box verschieben & QR-Codes
// ============================================

// Box zu anderem Objekt verschieben
exports.moveToObject = async (boxId, newObjectId, organisationId) => {
  // Prüfe ob Objekt zur Organisation gehört
  const { data: obj } = await supabase
    .from("objects")
    .select("id, lat, lng")
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
      lat: obj.lat,
      lng: obj.lng,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// QR-Code zuweisen
exports.assignQrCode = async (boxId, qrCode, organisationId) => {
  // Prüfe ob Code existiert und zur Organisation gehört
  const { data: code } = await supabase
    .from("qr_codes")
    .select("id, organisation_id, box_id")
    .eq("id", qrCode)
    .single();

  if (!code) {
    return { success: false, message: "QR-Code nicht gefunden" };
  }

  if (code.organisation_id !== organisationId) {
    return { success: false, message: "QR-Code gehört zu anderer Organisation" };
  }

  if (code.box_id && code.box_id !== boxId) {
    return { success: false, message: "QR-Code ist bereits einer anderen Box zugewiesen" };
  }

  // Code der Box zuweisen
  await supabase
    .from("qr_codes")
    .update({
      box_id: boxId,
      assigned: true,
      assigned_at: new Date().toISOString()
    })
    .eq("id", qrCode);

  // Box aktualisieren
  const { data, error } = await supabase
    .from("boxes")
    .update({
      qr_code: qrCode,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// QR-Code entfernen
exports.removeQrCode = async (boxId, organisationId) => {
  // Hole aktuelle Box
  const { data: box } = await supabase
    .from("boxes")
    .select("qr_code")
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .single();

  if (!box) {
    return { success: false, message: "Box nicht gefunden" };
  }

  if (box.qr_code) {
    // Code freigeben
    await supabase
      .from("qr_codes")
      .update({
        box_id: null,
        assigned: false,
        assigned_at: null
      })
      .eq("id", box.qr_code);
  }

  // Box aktualisieren
  const { data, error } = await supabase
    .from("boxes")
    .update({
      qr_code: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", boxId)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, data };
};

// Mehrere Boxen verschieben
exports.bulkMoveToObject = async (boxIds, newObjectId, organisationId) => {
  // Prüfe Objekt
  const { data: obj } = await supabase
    .from("objects")
    .select("id, lat, lng")
    .eq("id", newObjectId)
    .eq("organisation_id", organisationId)
    .single();

  if (!obj) {
    return { success: false, message: "Ziel-Objekt nicht gefunden" };
  }

  const results = [];
  for (const boxId of boxIds) {
    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: newObjectId,
        lat: obj.lat,
        lng: obj.lng,
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    results.push({ boxId, success: !error, data });
  }

  return { success: true, moved: results.filter(r => r.success).length, results };
};