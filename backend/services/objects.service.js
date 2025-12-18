// ============================================
// OBJECTS SERVICE (GPS ENABLED)
// Mit Befallsstatus-Berechnung
// ============================================

const { supabase } = require("../config/supabase");

// ============================================
// HELPER: Score zu Farbe
// ============================================
const getStatusColor = (avgScore) => {
  if (avgScore === null || avgScore === undefined) return 'gray';
  if (avgScore <= 0.5) return 'green';
  if (avgScore <= 1.2) return 'yellow';
  if (avgScore <= 2.0) return 'orange';
  return 'red';
};

// ============================================
// GET ALL OBJECTS MIT BEFALLS-SCORE
// ============================================
exports.getAll = async (organisationId) => {
  // 1. Alle Objekte holen
  const { data: objects, error } = await supabase
    .from("objects")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("name");

  if (error) return { success: false, message: error.message };

  // 2. Für jedes Objekt den Befalls-Score berechnen
  const objectsWithScore = await Promise.all(
    (objects || []).map(async (obj) => {
      // Alle Boxen des Objekts mit letztem Scan-Status holen
      const { data: boxes } = await supabase
        .from("boxes")
        .select("id, current_status")
        .eq("object_id", obj.id)
        .neq("status", "archived");

      const boxCount = boxes?.length || 0;
      
      if (boxCount === 0) {
        return { 
          ...obj, 
          box_count: 0, 
          scanned_count: 0, 
          avg_score: null, 
          status_color: 'gray' 
        };
      }

      // Score berechnen basierend auf current_status
      const statusScores = { green: 0, yellow: 1, orange: 2, red: 3 };
      let totalScore = 0;
      let scannedCount = 0;

      boxes.forEach(box => {
        const status = (box.current_status || '').toLowerCase();
        if (status in statusScores) {
          totalScore += statusScores[status];
          scannedCount++;
        }
      });

      const avgScore = scannedCount > 0 ? totalScore / scannedCount : null;

      return {
        ...obj,
        box_count: boxCount,
        scanned_count: scannedCount,
        avg_score: avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
        status_color: getStatusColor(avgScore)
      };
    })
  );

  return { success: true, data: objectsWithScore };
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
    console.log(`🗑️ Deleting object ${id} and cleaning up floor plan images...`);

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
        console.log(`🗑️ Deleting ${filePaths.length} floor plan images from storage...`);
        
        const { error: storageError } = await supabase.storage
          .from('floorplans')
          .remove(filePaths);

        if (storageError) {
          console.warn("⚠️ Could not delete some images from storage:", storageError);
          // Continue anyway - don't block deletion
        } else {
          console.log(`✅ Deleted ${filePaths.length} images from storage`);
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

    console.log(`✅ Object ${id} deleted successfully`);
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