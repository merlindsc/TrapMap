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
    city: obj.city || null,
    zip: obj.zip || null,
    lat: obj.lat || null,
    lng: obj.lng || null,
    contact_person: obj.contact_person || null,
    phone: obj.phone || null,
    notes: obj.notes || null,
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

// ============================================
// DELETE OBJECT + CLEANUP FLOOR PLAN IMAGES
// ============================================
exports.remove = async (id, organisationId) => {
  try {
    // 1. Get all floor plans for this object to find images
    const { data: floorPlans, error: fpError } = await supabase
      .from("layouts")
      .select("id, image_url")
      .eq("object_id", id)
      .eq("organisation_id", organisationId);

    if (fpError) {
      console.warn("⚠️ Could not load floor plans for cleanup:", fpError);
    }

    // 2. Delete images from Supabase Storage
    if (floorPlans && floorPlans.length > 0) {
      const filePaths = [];
      
      for (const fp of floorPlans) {
        if (fp.image_url) {
          // Extract file path from URL
          // URL format: https://xxx.supabase.co/storage/v1/object/public/floorplans/path/to/file.jpg
          const match = fp.image_url.match(/\/floorplans\/(.+)$/);
          if (match) {
            filePaths.push(match[1]);
          }
        }
      }

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('floorplans')
          .remove(filePaths);

        if (storageError) {
          console.warn("⚠️ Could not delete some images from storage:", storageError);
          // Continue anyway - don't block deletion
        }
      }
    }

    // 3. Delete the object (cascade will handle layouts, boxes, scans)
    const { error } = await supabase
      .from("objects")
      .delete()
      .eq("id", id)
      .eq("organisation_id", organisationId);

    if (error) return { success: false, message: error.message };

    return { success: true };

  } catch (err) {
    console.error("Error deleting object:", err);
    return { success: false, message: err.message };
  }
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