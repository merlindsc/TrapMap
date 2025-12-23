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
// Nur aktive Objekte (archived_at IS NULL), optional alle
// ============================================
exports.getAll = async (organisationId, includeArchived = false) => {
  // 1. Alle Objekte holen
  let query = supabase
    .from("objects")
    .select("*")
    .eq("organisation_id", organisationId);
  
  // Nur aktive Objekte wenn nicht explizit alle angefragt
  if (!includeArchived) {
    query = query.is("archived_at", null);
  }
  
  const { data: objects, error } = await query.order("name");

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
    gps_edit_enabled: false,
    offline_radius: obj.offline_radius || 25  // Standard: 25m (50x50m)
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
// ⚠️ ACHTUNG: Beim Löschen werden ALLE DATEN unwiderruflich gelöscht:
//    - Alle Scans/Scan-Historie
//    - Alle Grundrisse (Layouts)
//    - Alle Zonen
//    - Alle Fotos
//    → Boxen werden ERHALTEN und gehen zurück ins Lager!
// ============================================
exports.remove = async (id, organisationId) => {
  try {
    console.log(`🗑️ Deleting object ${id}...`);
    console.log(`⚠️ WARNUNG: Alle Scans, Grundrisse und Zonen werden UNWIDERRUFLICH gelöscht!`);
    console.log(`📦 Boxen werden zurück ins Lager verschoben...`);

    // 1. Hole alle Boxen des Objekts (auch unplatzierte)
    const { data: boxesCheck, error: checkError } = await supabase
      .from("boxes")
      .select("id, qr_code, object_id, position_type")
      .eq("object_id", id)
      .eq("organisation_id", organisationId);
    
    if (checkError) {
      console.error("❌ Error checking boxes:", checkError);
    }
    
    console.log(`📦 Found ${boxesCheck?.length || 0} boxes with object_id=${id}:`, 
      boxesCheck?.map(b => ({ id: b.id, qr: b.qr_code, pos_type: b.position_type }))
    );

    // 2. BOXEN ZURÜCK INS LAGER - Reset ALLE Boxen dieses Objekts
    const { data: returnedBoxes, error: boxResetError } = await supabase
      .from("boxes")
      .update({
        object_id: null,
        box_type_id: null,
        box_name: null,
        lat: null,
        lng: null,
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        position_type: null,
        layout_id: null
      })
      .eq("object_id", id)
      .eq("organisation_id", organisationId)
      .select("id, qr_code");

    if (boxResetError) {
      console.error("❌ Box reset error:", boxResetError);
      return { success: false, message: `Box reset failed: ${boxResetError.message}` };
    }

    const boxCount = returnedBoxes?.length || 0;
    console.log(`✅ RESET COMPLETE: ${boxCount} Boxen zurück ins Lager`);
    console.log(`   QR-Codes: ${returnedBoxes?.map(b => b.qr_code).join(', ') || 'none'}`);

    // 2. Get all floor plans for this object to find images
    const { data: floorPlans, error: fpError } = await supabase
      .from("layouts")
      .select("id, image_url")
      .eq("object_id", id)
      .eq("organisation_id", organisationId);

    if (fpError) {
      console.warn("⚠️ Could not load floor plans for cleanup:", fpError);
    }

    // 3. Delete images from Supabase Storage
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

    // 3. Delete the object (cascade will handle layouts, scans, zones - Boxen wurden bereits zurück ins Lager verschoben!)
    const { error } = await supabase
      .from("objects")
      .delete()
      .eq("id", id)
      .eq("organisation_id", organisationId);

    if (error) return { success: false, message: error.message };

    console.log(`✅ Objekt ${id} gelöscht. ${boxCount} Boxen sind jetzt im Lager verfügbar.`);
    return { success: true, boxesReturned: boxCount };

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

// ============================================
// GET ARCHIVED OBJECTS
// ============================================
exports.getArchived = async (organisationId) => {
  const { data, error } = await supabase
    .from("objects")
    .select("*")
    .eq("organisation_id", organisationId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) return { success: false, message: error.message };

  return { success: true, data: data || [] };
};

// ============================================
// RELEASE UNPLACED BOXES
// Gibt nur Boxen zurück die position_type = null oder 'none' haben
// ============================================
exports.releaseUnplacedBoxes = async (id, organisationId) => {
  try {
    console.log(`📦 Releasing unplaced boxes for object ${id}...`);

    // Hole alle unplatzierten Boxen (position_type = null oder 'none')
    const { data: unplacedBoxes, error: checkError } = await supabase
      .from("boxes")
      .select("id, qr_code, position_type")
      .eq("object_id", id)
      .eq("organisation_id", organisationId)
      .or("position_type.is.null,position_type.eq.none");
    
    if (checkError) {
      console.error("❌ Error checking unplaced boxes:", checkError);
      return { success: false, message: checkError.message };
    }

    const count = unplacedBoxes?.length || 0;
    
    if (count === 0) {
      console.log("ℹ️ No unplaced boxes found");
      return { success: true, count: 0, message: "Keine unplatzierten Boxen gefunden" };
    }

    console.log(`📦 Found ${count} unplaced boxes:`, 
      unplacedBoxes.map(b => ({ id: b.id, qr: b.qr_code, pos_type: b.position_type }))
    );

    const boxIds = unplacedBoxes.map(b => b.id);

    // Reset unplatzierte Boxen zurück ins Lager
    const { data: resetBoxes, error: resetError } = await supabase
      .from("boxes")
      .update({
        object_id: null,
        box_type_id: null,
        box_name: null,
        lat: null,
        lng: null,
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        position_type: null,
        layout_id: null
      })
      .in("id", boxIds)
      .eq("organisation_id", organisationId)
      .select("id, qr_code");

    if (resetError) {
      console.error("❌ Error releasing boxes:", resetError);
      return { success: false, message: resetError.message };
    }

    const releasedCount = resetBoxes?.length || 0;
    console.log(`✅ Released ${releasedCount} unplaced boxes`);
    console.log(`   QR-Codes: ${resetBoxes?.map(b => b.qr_code).join(', ') || 'none'}`);

    return { success: true, count: releasedCount };
  } catch (err) {
    console.error("❌ releaseUnplacedBoxes error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// ARCHIVE OBJECT
// Boxen zurück ins Lager (Pool), Objekt als archiviert markieren
// ============================================
exports.archive = async (id, organisationId, userId, reason = null) => {
  try {
    console.log(`📦 Archiving object ${id}...`);

    // 1. Objekt archivieren (archived_by kann null sein wenn Spalte nicht UUID ist)
    const updateData = {
      archived_at: new Date().toISOString(),
      archive_reason: reason || null
    };
    
    // Nur archived_by setzen wenn userId eine gültige UUID ist
    if (userId && typeof userId === 'string' && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      updateData.archived_by = userId;
    }
    
    const { error: archiveError } = await supabase
      .from("objects")
      .update(updateData)
      .eq("id", id)
      .eq("organisation_id", organisationId);

    if (archiveError) {
      console.error("Archive error:", archiveError);
      return { success: false, message: archiveError.message };
    }

    // 2. Alle Boxen des Objekts zurück in Pool (Position + Typ reset)
    console.log(`📦 Starting box reset for object ${id}...`);
    
    // Hole alle Boxen des Objekts (auch unplatzierte)
    const { data: boxesCheck, error: checkError } = await supabase
      .from("boxes")
      .select("id, qr_code, object_id, position_type")
      .eq("object_id", id)
      .eq("organisation_id", organisationId);
    
    if (checkError) {
      console.error("❌ Error checking boxes:", checkError);
    }
    
    console.log(`📦 Found ${boxesCheck?.length || 0} boxes with object_id=${id}:`, 
      boxesCheck?.map(b => ({ id: b.id, qr: b.qr_code, pos_type: b.position_type }))
    );
    
    // Reset ALLE Boxen dieses Objekts
    const { data: resetBoxes, error: resetError } = await supabase
      .from("boxes")
      .update({
        object_id: null,
        box_type_id: null,
        box_name: null,
        lat: null,
        lng: null,
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        position_type: null,
        layout_id: null
      })
      .eq("object_id", id)
      .eq("organisation_id", organisationId)
      .select("id, qr_code");

    if (resetError) {
      console.error("❌ Box reset error:", resetError);
      return { success: false, message: `Box reset failed: ${resetError.message}` };
    }

    const boxesReturned = resetBoxes?.length || 0;
    console.log(`✅ RESET COMPLETE: ${boxesReturned} Boxen zurück ins Lager`);
    console.log(`   QR-Codes: ${resetBoxes?.map(b => b.qr_code).join(', ') || 'none'}`);

    // 3. Audit-Log (falls Tabelle existiert)
    try {
      await supabase.from("audit_log").insert({
        action: "object_archived",
        table_name: "objects",
        record_id: id,
        user_id: userId,
        changes: { reason, boxes_returned: boxesReturned },
        created_at: new Date().toISOString()
      });
    } catch (e) {
      // Audit-Log optional, ignorieren wenn nicht vorhanden
    }

    console.log(`✅ Object ${id} archived successfully`);
    
    return { 
      success: true, 
      boxesReturned
    };

  } catch (err) {
    console.error("Error archiving object:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// RESTORE ARCHIVED OBJECT
// ============================================
exports.restore = async (id, organisationId, userId) => {
  try {
    console.log(`🔄 Restoring object ${id}...`);

    const { error } = await supabase
      .from("objects")
      .update({
        archived_at: null,
        archived_by: null,
        archive_reason: null
      })
      .eq("id", id)
      .eq("organisation_id", organisationId);

    if (error) {
      console.error("Restore error:", error);
      return { success: false, message: error.message };
    }

    // Audit-Log (falls Tabelle existiert)
    try {
      await supabase.from("audit_log").insert({
        action: "object_restored",
        table_name: "objects",
        record_id: id,
        user_id: userId,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      // Audit-Log optional
    }

    console.log(`✅ Object ${id} restored successfully`);
    return { success: true };

  } catch (err) {
    console.error("Error restoring object:", err);
    return { success: false, message: err.message };
  }
};