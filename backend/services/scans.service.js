const { supabase } = require("../config/supabase");

exports.getHistoryForBox = async (boxId, orgId) => {
  const { data, error } = await supabase
    .from("scans")
    .select(`
      id,
      status,
      notes,
      photo_url,
      consumption,
      quantity,
      trap_state,
      scanned_at,
      user_id,
      box_type_id,
      users (
        id,
        first_name,
        last_name
      ),
      box_types (
        id,
        name,
        category
      )
    `)
    .eq("box_id", boxId)
    .eq("organisation_id", orgId)
    .order("scanned_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getHistoryForBox error:", error);
    return { success: false, message: error.message };
  }

  const enriched = (data || []).map(s => ({
    ...s,
    user_name: s.users 
      ? `${s.users.first_name || ""} ${s.users.last_name || ""}`.trim() 
      : "Unbekannt",
    box_type_name: s.box_types?.name || null
  }));

  return { success: true, data: enriched };
};

exports.getHistoryForObject = async (objectId, orgId) => {
  const { data: boxes } = await supabase
    .from("boxes")
    .select("id")
    .eq("object_id", objectId)
    .eq("organisation_id", orgId);

  if (!boxes || boxes.length === 0) {
    return { success: true, data: [] };
  }

  const boxIds = boxes.map(b => b.id);

  const { data, error } = await supabase
    .from("scans")
    .select(`
      id,
      status,
      notes,
      photo_url,
      consumption,
      quantity,
      trap_state,
      scanned_at,
      box_id,
      user_id,
      box_type_id,
      users (
        id,
        first_name,
        last_name
      ),
      boxes (
        id,
        box_name,
        number
      ),
      box_types (
        id,
        name,
        category
      )
    `)
    .in("box_id", boxIds)
    .eq("organisation_id", orgId)
    .order("scanned_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getHistoryForObject error:", error);
    return { success: false, message: error.message };
  }

  const enriched = (data || []).map(s => ({
    ...s,
    user_name: s.users 
      ? `${s.users.first_name || ""} ${s.users.last_name || ""}`.trim() 
      : "Unbekannt",
    box_name: s.boxes?.box_name || `Box ${s.boxes?.number || "?"}`,
    box_type_name: s.box_types?.name || null
  }));

  return { success: true, data: enriched };
};

exports.create = async (data, orgId, file) => {
  let photoUrl = null;

  // Foto hochladen - Dateiname bereinigen
  if (file) {
    const cleanName = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_");
    
    const fileName = `scans/${orgId}/${Date.now()}_${cleanName}`;
    
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
    } else {
      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);
      
      photoUrl = urlData.publicUrl;
      console.log("📷 Photo uploaded:", photoUrl);
    }
  }

  // Box-Daten holen (box_type_id + object_id)
  const { data: boxData } = await supabase
    .from("boxes")
    .select("box_type_id, object_id")
    .eq("id", data.box_id)
    .single();

  // Quantity String zu Integer konvertieren
  let quantityInt = null;
  if (data.quantity && data.quantity !== "none") {
    const qMap = {
      "none": 0,
      "0-5": 1,
      "5-10": 2,
      "10-20": 3,
      "20+": 4
    };
    quantityInt = qMap[data.quantity] ?? null;
  }

  console.log("📝 Scan insert - box_id:", data.box_id, "object_id:", boxData?.object_id);

  // Scan einfügen
  const { data: scan, error } = await supabase
    .from("scans")
    .insert({
      organisation_id: orgId,
      box_id: parseInt(data.box_id),
      object_id: boxData?.object_id || null,  // ← NEU
      user_id: parseInt(data.user_id),
      box_type_id: boxData?.box_type_id || null,
      status: data.status,
      notes: data.notes || null,
      consumption: data.consumption ? parseInt(data.consumption) : null,
      quantity: quantityInt,
      trap_state: data.trap_state ? parseInt(data.trap_state) : null,
      photo_url: photoUrl,
      scanned_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("Scan create error:", error);
    return { success: false, message: error.message };
  }

  // Box-Status aktualisieren
  await supabase
    .from("boxes")
    .update({ 
      current_status: data.status,
      last_scan: new Date().toISOString()
    })
    .eq("id", data.box_id);

  return { success: true, data: scan };
};