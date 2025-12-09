// ============================================
// OBJECTS SERVICE (GPS ENABLED)
// ============================================

const { supabase } = require("../config/supabase");

exports.getAll = async (organisationId) => {
  const { data, error } = await supabase
    .from("objects")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("name");

  if (error) return { success: false, message: error.message };

  return { success: true, data };
};

exports.getOne = async (id, organisationId) => {
  const { data, error } = await supabase
    .from("objects")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .single();

  if (error || !data) {
    return { success: false, message: "Object not found" };
  }

  return { success: true, data };
};

exports.create = async (organisationId, obj) => {
  const payload = {
    organisation_id: organisationId,
    name: obj.name,
    address: obj.address || null,
    city: obj.city || null,           // NEU
    zip: obj.zip || null,             // NEU
    lat: obj.lat || null,
    lng: obj.lng || null,
    contact_person: obj.contact_person || null,  // NEU
    phone: obj.phone || null,                    // NEU
    notes: obj.notes || null,                    // NEU
    gps_edit_enabled: false
  };

  const { data, error } = await supabase
    .from("objects")
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  return { success: true, data };
};

exports.update = async (id, organisationId, updates) => {
  const { data, error } = await supabase
    .from("objects")
    .update(updates)
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  return { success: true, data };
};

exports.remove = async (id, organisationId) => {
  const { error } = await supabase
    .from("objects")
    .delete()
    .eq("id", id)
    .eq("organisation_id", organisationId);

  if (error) return { success: false, message: error.message };

  return { success: true };
};

// ============================================
// ENABLE / DISABLE GPS EDITING
// ============================================
exports.setGPSEditEnabled = async (id, organisationId, enabled) => {
  const { data, error } = await supabase
    .from("objects")
    .update({ gps_edit_enabled: enabled })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  return { success: true, data };
};

// ============================================
// UPDATE OBJECT LOCATION
// ============================================
exports.updateLocation = async (id, organisationId, lat, lng) => {
  const { data, error } = await supabase
    .from("objects")
    .update({ lat, lng })
    .eq("id", id)
    .eq("organisation_id", organisationId)
    .select()
    .single();

  if (error) return { success: false, message: error.message };

  return { success: true, data };
};
