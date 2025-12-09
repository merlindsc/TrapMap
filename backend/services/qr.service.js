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

// Check if QR code is assigned
exports.checkCode = async (code) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Assign QR code to a box
exports.assignCode = async (code, box_id) => {
  const { error } = await supabase
    .from("qr_codes")
    .update({
      box_id,
      assigned: true,
      assigned_at: new Date()
    })
    .eq("id", code);

  if (error) throw new Error(error.message);
  return true;
};
