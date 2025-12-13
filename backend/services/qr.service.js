// ============================================
// QR SERVICE - KOMPLETT (FIXED)
// Bei Code-Generierung wird automatisch Box erstellt!
// FIX: Sortierung nach sequence_number (aufsteigend)
// ============================================

const { supabase } = require("../config/supabase");
const crypto = require("crypto");

// Eindeutiger Code: TM-XXXX-XXXX-XXXX
const generateUniqueCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TM-";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
};

// ============================================
// GENERATE CODES + BOXES
// ============================================
exports.generateCodes = async (organisation_id, count) => {
  const results = [];
  let attempts = 0;

  while (results.length < count && attempts < count * 3) {
    attempts++;
    const code = generateUniqueCode();

    // Code schon vorhanden?
    const { data: existing } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("id", code)
      .maybeSingle();

    if (existing) continue;

    // 1. QR-Code erstellen
    const { error: qrError } = await supabase
      .from("qr_codes")
      .insert({
        id: code,
        organisation_id: parseInt(organisation_id),
        assigned: false
      });

    if (qrError) continue;

    // 2. Box im Pool erstellen
    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .insert({
        organisation_id: parseInt(organisation_id),
        qr_code: code,
        status: "pool",
        position_type: "none",
        current_status: "green",
        active: true
      })
      .select()
      .single();

    if (boxError) {
      // Rollback: QR-Code löschen
      await supabase.from("qr_codes").delete().eq("id", code);
      continue;
    }

    // 3. QR-Code mit Box verknüpfen
    await supabase
      .from("qr_codes")
      .update({
        box_id: box.id,
        assigned: true,
        assigned_at: new Date().toISOString()
      })
      .eq("id", code);

    results.push({ code, box_id: box.id });
  }

  return results;
};

// ============================================
// CHECK CODE
// ============================================
exports.checkCode = async (code) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select(`
      id, organisation_id, box_id, assigned, sequence_number,
      boxes:box_id (
        id, number, status, position_type, object_id, box_type_id, current_status,
        objects:object_id (id, name),
        box_types:box_type_id (id, name)
      )
    `)
    .eq("id", code.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// ============================================
// GET CODES BY ORGANISATION
// FIX: Sortierung nach sequence_number AUFSTEIGEND (kleinste zuerst)
// ============================================
exports.getCodesByOrganisation = async (organisation_id) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select(`
      id, box_id, assigned, created_at, sequence_number,
      boxes:box_id (
        id, number, status, position_type, object_id, box_type_id, current_status,
        objects:object_id (id, name),
        box_types:box_type_id (id, name)
      )
    `)
    .eq("organisation_id", parseInt(organisation_id))
    .order("sequence_number", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  
  // Debug logging
  console.log(`📦 getCodesByOrganisation: ${data?.length || 0} Codes geladen für org ${organisation_id}`);
  
  return data || [];
};

// ============================================
// GET AVAILABLE (Pool-Boxen)
// FIX: Sortierung nach number AUFSTEIGEND
// ============================================
exports.getAvailableCodes = async (organisation_id) => {
  const { data, error } = await supabase
    .from("boxes")
    .select("id, qr_code, number, status, created_at")
    .eq("organisation_id", parseInt(organisation_id))
    .eq("status", "pool")
    .eq("active", true)
    .order("number", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data || [];
};

// ============================================
// ASSIGN CODE TO BOX (Legacy)
// ============================================
exports.assignCode = async (code, box_id) => {
  const { error } = await supabase
    .from("qr_codes")
    .update({
      box_id,
      assigned: true,
      assigned_at: new Date().toISOString()
    })
    .eq("id", code);

  if (error) throw new Error(error.message);

  // Box aktualisieren
  await supabase
    .from("boxes")
    .update({ qr_code: code })
    .eq("id", box_id);

  return true;
};

// ============================================
// ASSIGN BOX TO OBJECT
// ============================================
exports.assignToObject = async (box_id, object_id, organisation_id) => {
  const { error } = await supabase
    .from("boxes")
    .update({
      object_id: parseInt(object_id),
      status: "assigned",
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(box_id))
    .eq("organisation_id", parseInt(organisation_id));

  if (error) throw new Error(error.message);
  return { success: true };
};

// ============================================
// RETURN TO POOL
// ============================================
exports.returnToPool = async (box_id, organisation_id) => {
  const { error } = await supabase
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
    .eq("id", parseInt(box_id))
    .eq("organisation_id", parseInt(organisation_id));

  if (error) throw new Error(error.message);
  return { success: true };
};

// ============================================
// MOVE TO OTHER OBJECT
// ============================================
exports.moveToObject = async (box_id, new_object_id, organisation_id) => {
  const { error } = await supabase
    .from("boxes")
    .update({
      object_id: parseInt(new_object_id),
      status: "assigned",
      position_type: "none",
      lat: null,
      lng: null,
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(box_id))
    .eq("organisation_id", parseInt(organisation_id));

  if (error) throw new Error(error.message);
  return { success: true };
};