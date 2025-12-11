const { supabase } = require("../config/supabase");
const crypto = require("crypto");

// Generate QR Codes
exports.generateCodes = async (organisation_id, count) => {
  const codes = [];

  for (let i = 0; i < count; i++) {
    const code = "tmx_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    await supabase.from("qr_codes").insert({
      id: code,
      organisation_id
    });

    codes.push(code);
  }

  return codes;
};

// Check if QR code exists and is assigned
exports.checkCode = async (code) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  
  // Wenn Code nicht existiert, gib trotzdem eine Antwort zurück
  if (!data) {
    return {
      id: code,
      assigned: false,
      box_id: null,
      exists: false
    };
  }

  return {
    ...data,
    exists: true
  };
};

// Assign QR code to a box (erstellt Code falls nicht vorhanden)
exports.assignCode = async (code, box_id, organisation_id) => {
  // Prüfe ob Code bereits existiert
  const { data: existing } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("id", code)
    .maybeSingle();

  if (existing) {
    // Code existiert → Update
    const { error } = await supabase
      .from("qr_codes")
      .update({
        box_id,
        assigned: true,
        assigned_at: new Date()
      })
      .eq("id", code);

    if (error) throw new Error(error.message);
  } else {
    // Code existiert nicht → Insert
    const { error } = await supabase
      .from("qr_codes")
      .insert({
        id: code,
        box_id,
        organisation_id,
        assigned: true,
        assigned_at: new Date()
      });

    if (error) throw new Error(error.message);
  }

  return true;
};

// Unassign QR code from box
exports.unassignCode = async (box_id) => {
  const { error } = await supabase
    .from("qr_codes")
    .update({
      box_id: null,
      assigned: false,
      assigned_at: null
    })
    .eq("box_id", box_id);

  if (error) throw new Error(error.message);
  return true;
};

// Get QR code by box_id
exports.getCodeByBox = async (box_id) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("box_id", box_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};