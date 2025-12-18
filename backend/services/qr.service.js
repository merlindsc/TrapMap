// ============================================
// QR SERVICE - KOMPLETT
// Bei Code-Generierung wird automatisch Box erstellt!
// returnToPool mit vollständigem Reset
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

    // Box-Nummer aus QR-Code extrahieren (ohne führende Nullen)
    const extractBoxNumber = (qrCode) => {
      const match = qrCode.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };
    
    const boxNumber = extractBoxNumber(code);

    // 2. Box im Pool erstellen (mit automatischer Nummer aus QR-Code)
    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .insert({
        organisation_id: parseInt(organisation_id),
        qr_code: code,
        number: boxNumber, // Automatisch aus QR-Code
        display_number: boxNumber ? boxNumber.toString() : null,
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
      id, organisation_id, box_id, assigned,
      boxes:box_id (
        id, number, display_number, qr_code, status, position_type, 
        object_id, box_type_id, current_status, box_name,
        lat, lng, floor_plan_id, pos_x, pos_y, grid_position,
        last_scan, control_interval_days, notes, bait,
        objects:object_id (id, name, address),
        box_types:box_type_id (id, name, category, short_code)
      )
    `)
    .eq("id", code.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// ============================================
// GET CODES BY ORGANISATION
// ============================================
exports.getCodesByOrganisation = async (organisation_id) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select(`
      id, box_id, assigned, created_at,
      boxes:box_id (
        id, number, status, position_type, object_id, box_type_id, current_status,
        objects:object_id (id, name),
        box_types:box_type_id (id, name)
      )
    `)
    .eq("organisation_id", parseInt(organisation_id))
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

// ============================================
// GET AVAILABLE (Pool-Boxen)
// ============================================
exports.getAvailableCodes = async (organisation_id) => {
  const { data, error } = await supabase
    .from("boxes")
    .select("id, qr_code, status, created_at")
    .eq("organisation_id", parseInt(organisation_id))
    .eq("status", "pool")
    .eq("active", true)
    .order("created_at", { ascending: true });

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

  // Box-Nummer aus QR-Code extrahieren (ohne führende Nullen)
  const extractBoxNumber = (qrCode) => {
    const match = qrCode.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };
  
  const boxNumber = extractBoxNumber(code);

  // Box aktualisieren mit QR-Code und automatischer Nummer
  await supabase
    .from("boxes")
    .update({ 
      qr_code: code,
      number: boxNumber,
      display_number: boxNumber ? boxNumber.toString() : null
    })
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
// RETURN TO POOL - VOLLSTÄNDIGER RESET!
// Box wird zurückgesetzt wie frisch aus QR-Order
// ============================================
exports.returnToPool = async (box_id, organisation_id) => {
  const { error } = await supabase
    .from("boxes")
    .update({
      // Objekt-Zuweisung entfernen
      object_id: null,
      
      // Status zurücksetzen
      status: "pool",
      position_type: "none",
      current_status: "green",  // Frischer Status!
      
      // Typ entfernen
      box_type_id: null,
      
      // GPS-Position löschen
      lat: null,
      lng: null,
      
      // Lageplan-Position löschen
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      grid_position: null,
      
      // Notizen löschen
      notes: null,
      
      // Intervall zurücksetzen
      control_interval_days: null,
      
      // Scan-Historie zurücksetzen (Box wie nie benutzt)
      last_scan: null,
      
      // Timestamp
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(box_id))
    .eq("organisation_id", parseInt(organisation_id));

  if (error) throw new Error(error.message);
  
  console.log(`📦 Box ${box_id} vollständig zurückgesetzt und ins Lager verschoben`);
  return { success: true };
};

// ============================================
// MOVE TO OTHER OBJECT
// Position wird zurückgesetzt, aber nicht alles
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
      grid_position: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(box_id))
    .eq("organisation_id", parseInt(organisation_id));

  if (error) throw new Error(error.message);
  return { success: true };
};