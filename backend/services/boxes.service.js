// ============================================
// BOXES SERVICE - KOMPLETT V2
// WICHTIG: number wird NICHT auf NULL gesetzt!
// Inkl. Bulk-Operationen
// ============================================

const { supabase } = require("../config/supabase");

// ============================================
// HELPER: QR-Nummer extrahieren (für Sortierung)
// DSE-0096 → 96
// ============================================
function extractQrNumber(qrCode) {
  if (!qrCode) return 999999;
  const match = qrCode.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 999999;
}

// ============================================
// GET ALL BOXES (sortiert nach Nummer)
// ============================================
exports.getAll = async (organisationId, objectId = null) => {
  try {
    let query = supabase
      .from("boxes")
      .select(`
        *,
        objects ( id, name ),
        box_types ( id, name, category, short_code ),
        floor_plans ( id, name )
      `)
      .eq("organisation_id", organisationId)
      .neq("status", "archived");

    if (objectId) {
      query = query.eq("object_id", objectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten und sortieren nach QR-Nummer (klein → groß)
    const boxes = (data || [])
      .map(box => ({
        ...box,
        object_name: box.objects?.name,
        box_type_name: box.box_types?.name,
        box_type_category: box.box_types?.category,
        short_code: box.box_types?.short_code,
        floor_plan_name: box.floor_plans?.name,
        _sort_number: extractQrNumber(box.qr_code) || box.number || 999999
      }))
      .sort((a, b) => a._sort_number - b._sort_number);

    return { success: true, data: boxes };
  } catch (err) {
    console.error("getAll error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET ONE BOX
// ============================================
exports.getOne = async (boxId, organisationId) => {
  try {
    const { data, error } = await supabase
      .from("boxes")
      .select(`
        *,
        objects ( id, name, address, city ),
        box_types ( id, name, category, short_code ),
        floor_plans ( id, name )
      `)
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, message: "Box nicht gefunden" };

    return { 
      success: true, 
      data: {
        ...data,
        object_name: data.objects?.name,
        box_type_name: data.box_types?.name,
        box_type_category: data.box_types?.category,
        short_code: data.box_types?.short_code
      }
    };
  } catch (err) {
    console.error("getOne error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// UPDATE BOX
// ============================================
exports.update = async (boxId, organisationId, updateData) => {
  try {
    const allowedFields = [
      "name", "number", "display_number", "notes", "bait", "box_name",
      "box_type_id", "control_interval_days", "control_interval_type",
      "control_interval_min", "control_interval_max"
    ];

    const cleanData = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        cleanData[key] = updateData[key];
      }
    }

    cleanData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("boxes")
      .update(cleanData)
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error("update error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// DELETE BOX (Soft Delete)
// ============================================
exports.remove = async (boxId, organisationId) => {
  try {
    const { error } = await supabase
      .from("boxes")
      .update({ 
        status: "archived",
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error("remove error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// UPDATE LOCATION (GPS)
// ============================================
exports.updateLocation = async (boxId, organisationId, lat, lng, userId, method = "manual") => {
  try {
    const { data, error } = await supabase
      .from("boxes")
      .update({
        lat,
        lng,
        position_type: "gps",
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) throw error;

    await logBoxEvent(boxId, userId, "location_updated", { lat, lng, method });

    return { success: true, data };
  } catch (err) {
    console.error("updateLocation error:", err);
    return { success: false, message: err.message };
  }
};

exports.updatePosition = exports.updateLocation;

// ============================================
// UNDO LOCATION
// ============================================
exports.undoLocation = async (boxId, organisationId) => {
  try {
    const { data, error } = await supabase
      .from("boxes")
      .update({
        lat: null,
        lng: null,
        position_type: "none",
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error("undoLocation error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET SCANS (Historie)
// ============================================
exports.getScans = async (boxId, organisationId, days = 90) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("scans")
      .select(`
        *,
        users ( id, first_name, last_name, email )
      `)
      .eq("box_id", boxId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err) {
    console.error("getScans error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET POOL BOXES (ohne Objekt) - SORTIERT!
// ============================================
exports.getPoolBoxes = async (organisationId) => {
  try {
    const { data, error } = await supabase
      .from("boxes")
      .select(`
        id,
        qr_code,
        number,
        display_number,
        status,
        current_status,
        box_type_id,
        box_types ( id, name, category )
      `)
      .eq("organisation_id", organisationId)
      .is("object_id", null)
      .neq("status", "archived")
      .not("qr_code", "is", null);

    if (error) throw error;

    // Sortieren nach QR-Nummer (klein → groß)
    const sorted = (data || []).sort((a, b) => {
      return extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code);
    });

    return { success: true, data: sorted };
  } catch (err) {
    console.error("getPoolBoxes error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET UNPLACED BOXES BY OBJECT
// ============================================
exports.getUnplacedByObject = async (objectId, organisationId) => {
  try {
    const { data, error } = await supabase
      .from("boxes")
      .select(`
        *,
        box_types ( id, name, category )
      `)
      .eq("object_id", objectId)
      .eq("organisation_id", organisationId)
      .or("position_type.is.null,position_type.eq.none")
      .neq("status", "archived");

    if (error) throw error;

    // Sortieren
    const sorted = (data || []).sort((a, b) => {
      return extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code);
    });

    return { success: true, data: sorted };
  } catch (err) {
    console.error("getUnplacedByObject error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// ASSIGN TO OBJECT
// ============================================
exports.assignToObject = async (boxId, objectId, organisationId, userId) => {
  try {
    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .select("id, number, qr_code")
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .single();

    if (boxError || !box) {
      return { success: false, message: "Box nicht gefunden" };
    }

    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: objectId,
        position_type: "none",
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) throw error;

    await logBoxEvent(boxId, userId, "assigned_to_object", { object_id: objectId });

    return { success: true, data };
  } catch (err) {
    console.error("assignToObject error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// BULK ASSIGN TO OBJECT - MEHRERE BOXEN ZUWEISEN
// Unterstützt sowohl Box-IDs als auch QR-Codes
// ============================================
exports.bulkAssignToObject = async (identifiers, objectId, organisationId, userId, useQrCodes = false) => {
  try {
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      return { success: false, message: "Keine Identifikatoren angegeben" };
    }

    if (identifiers.length > 100) {
      return { success: false, message: "Maximal 100 Boxen auf einmal" };
    }

    // ✅ Logging zur Debugging
    console.log(`📦 Bulk Assign: ${identifiers.length} Boxen zu Objekt ${objectId}`);
    console.log(`📦 Identifiers (${useQrCodes ? 'QR-Codes' : 'Box-IDs'}):`, identifiers);

    // Prüfen ob Boxen existieren - entweder über QR-Code oder ID
    let query = supabase
      .from("boxes")
      .select("id, qr_code, object_id")
      .eq("organisation_id", organisationId);
    
    if (useQrCodes) {
      query = query.in("qr_code", identifiers);
    } else {
      query = query.in("id", identifiers);
    }

    const { data: boxes, error: fetchError } = await query;

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError);
      throw fetchError;
    }

    if (!boxes || boxes.length === 0) {
      console.error("❌ Keine Boxen gefunden für:", identifiers);
      return { success: false, message: "Keine gültigen Boxen gefunden" };
    }

    // ✅ Prüfe welche Boxen bereits zugewiesen sind
    const availableBoxes = boxes.filter(b => b.object_id === null);
    const alreadyAssigned = boxes.filter(b => b.object_id !== null);

    if (alreadyAssigned.length > 0) {
      console.warn(`⚠️ ${alreadyAssigned.length} Boxen bereits zugewiesen:`, 
        alreadyAssigned.map(b => ({ id: b.id, qr: b.qr_code, object: b.object_id }))
      );
    }

    if (availableBoxes.length === 0) {
      return { 
        success: false, 
        message: "Alle angegebenen Boxen sind bereits zugewiesen" 
      };
    }

    const validIds = availableBoxes.map(b => b.id);

    console.log(`✅ ${validIds.length} Boxen verfügbar für Zuweisung`);

    // Alle verfügbaren Boxen dem Objekt zuweisen
    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: objectId,
        position_type: "none",
        updated_at: new Date().toISOString()
      })
      .in("id", validIds)
      .eq("organisation_id", organisationId)
      .select();

    if (error) throw error;

    // Audit Log
    for (const box of availableBoxes) {
      await logBoxEvent(box.id, userId, "assigned_to_object", { 
        object_id: objectId,
        bulk_operation: true
      });
    }

    console.log(`✅ ${data.length} Boxen erfolgreich Objekt ${objectId} zugewiesen`);

    return { 
      success: true, 
      data,
      count: data.length,
      skipped: alreadyAssigned.length,
      skipped_reason: alreadyAssigned.length > 0 ? "already_assigned" : null,
      skipped_codes: alreadyAssigned.map(b => b.qr_code).filter(qr => qr != null)
    };
  } catch (err) {
    console.error("❌ bulkAssignToObject error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// BULK ASSIGN BY COUNT - Backend wählt automatisch
// ============================================
exports.bulkAssignByCount = async (count, objectId, organisationId, userId) => {
  try {
    if (count < 1 || count > 300) {
      return { success: false, message: "Anzahl muss zwischen 1 und 300 liegen" };
    }

    // Hole ALLE verfügbaren Pool-Boxen (wir sortieren selbst nach QR-Nummer)
    const { data: allPoolBoxes, error: poolError } = await supabase
      .from("boxes")
      .select("id, qr_code, number")
      .eq("organisation_id", organisationId)
      .is("object_id", null)
      .neq("status", "archived")
      .not("qr_code", "is", null);

    if (poolError) throw poolError;

    if (!allPoolBoxes || allPoolBoxes.length === 0) {
      return { success: false, message: "Keine Boxen im Lager verfügbar" };
    }

    // Sortiere nach QR-Code Nummer (z.B. DSE-0001 → 1, XX19 → 19)
    const sortedBoxes = allPoolBoxes.sort((a, b) => {
      return extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code);
    });

    // Nimm die ersten 'count' Boxen (kleinste Nummern)
    const poolBoxes = sortedBoxes.slice(0, count);

    console.log(`📦 Selecting ${poolBoxes.length} boxes with lowest numbers:`, 
      poolBoxes.map(b => ({ qr: b.qr_code, num: extractQrNumber(b.qr_code) }))
    );

    if (poolBoxes.length < count) {
      console.log(`⚠️ Nur ${poolBoxes.length} von ${count} angeforderten Boxen verfügbar`);
    }

    const boxIds = poolBoxes.map(b => b.id);

    console.log(`📦 Assigning ${boxIds.length} boxes to object ${objectId}`);

    // Boxen zuweisen
    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: objectId,
        position_type: "none",
        updated_at: new Date().toISOString()
      })
      .in("id", boxIds)
      .eq("organisation_id", organisationId)
      .is("object_id", null) // Doppelte Sicherheit: nur unzugewiesene
      .select();

    if (error) throw error;

    // Audit Log
    for (const box of data) {
      await logBoxEvent(box.id, userId, "assigned_to_object", { 
        object_id: objectId,
        bulk_operation: true,
        method: "count_based"
      });
    }

    console.log(`✅ ${data.length} Boxen erfolgreich zugewiesen`);

    return { 
      success: true, 
      data,
      count: data.length
    };
  } catch (err) {
    console.error("❌ bulkAssignByCount error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// RETURN TO POOL - VOLLSTÄNDIGER RESET!
// WICHTIG: number wird NICHT auf NULL gesetzt!
// ============================================
exports.returnToPool = async (boxId, organisationId, userId) => {
  try {
    // Box laden für Audit
    const { data: oldBox, error: fetchError } = await supabase
      .from("boxes")
      .select("id, object_id, number, qr_code, box_type_id")
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .single();

    if (fetchError || !oldBox) {
      return { success: false, message: "Box nicht gefunden" };
    }

    // Box zurücksetzen - NUR existierende Spalten!
    // number und qr_code werden BEHALTEN!
    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: null,
        position_type: null,
        lat: null,
        lng: null,
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        box_type_id: null,
        bait: null,
        notes: null,
        current_status: null,
        last_scan: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) throw error;

    await logBoxEvent(boxId, userId, "returned_to_pool", { 
      old_object_id: oldBox.object_id,
      old_box_type_id: oldBox.box_type_id
    });

    console.log(`✅ Box ${boxId} (QR: ${oldBox.qr_code}) zurück ins Lager`);

    return { success: true, data };
  } catch (err) {
    console.error("returnToPool error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// BULK RETURN TO POOL - Mehrere Boxen auf einmal
// ============================================
exports.bulkReturnToPool = async (boxIds, organisationId, userId) => {
  try {
    if (!Array.isArray(boxIds) || boxIds.length === 0) {
      return { success: false, message: "Keine Box-IDs angegeben" };
    }

    if (boxIds.length > 100) {
      return { success: false, message: "Maximal 100 Boxen auf einmal" };
    }

    // Boxen laden für Audit
    const { data: boxes, error: fetchError } = await supabase
      .from("boxes")
      .select("id, object_id, number, qr_code")
      .in("id", boxIds)
      .eq("organisation_id", organisationId);

    if (fetchError) throw fetchError;

    if (!boxes || boxes.length === 0) {
      return { success: false, message: "Keine gültigen Boxen gefunden" };
    }

    // Alle Boxen zurücksetzen (NUR existierende Spalten!)
    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: null,
        position_type: null,
        lat: null,
        lng: null,
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        box_type_id: null,
        bait: null,
        notes: null,
        current_status: null,
        last_scan: null,
        updated_at: new Date().toISOString()
      })
      .in("id", boxIds)
      .eq("organisation_id", organisationId)
      .select();

    if (error) throw error;

    // Audit Log für jede Box
    for (const box of boxes) {
      await logBoxEvent(box.id, userId, "returned_to_pool", { 
        old_object_id: box.object_id,
        bulk_operation: true
      });
    }

    console.log(`✅ ${data.length} Boxen zurück ins Lager`);

    return { 
      success: true, 
      data,
      count: data.length
    };
  } catch (err) {
    console.error("bulkReturnToPool error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// ARCHIVE OBJECT BOXES - Alle Boxen eines Objekts ins Lager
// ============================================
exports.archiveObjectBoxes = async (objectId, organisationId, userId) => {
  try {
    // Alle Boxen des Objekts finden
    const { data: boxes, error: fetchError } = await supabase
      .from("boxes")
      .select("id, number, qr_code")
      .eq("object_id", objectId)
      .eq("organisation_id", organisationId)
      .neq("status", "archived");

    if (fetchError) throw fetchError;

    if (!boxes || boxes.length === 0) {
      return { success: true, data: [], count: 0, message: "Keine Boxen vorhanden" };
    }

    const boxIds = boxes.map(b => b.id);

    // Alle Boxen zurücksetzen (NUR existierende Spalten!)
    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: null,
        position_type: null,
        lat: null,
        lng: null,
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
        grid_position: null,
        box_type_id: null,
        bait: null,
        notes: null,
        current_status: null,
        last_scan: null,
        updated_at: new Date().toISOString()
      })
      .in("id", boxIds)
      .eq("organisation_id", organisationId)
      .select();

    if (error) throw error;

    // Audit Log
    for (const box of boxes) {
      await logBoxEvent(box.id, userId, "returned_to_pool", { 
        old_object_id: objectId,
        reason: "object_archived"
      });
    }

    console.log(`✅ ${data.length} Boxen von Objekt ${objectId} zurück ins Lager`);

    return { 
      success: true, 
      data,
      count: data.length
    };
  } catch (err) {
    console.error("archiveObjectBoxes error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// PLACE ON MAP (GPS)
// ============================================
exports.placeOnMap = async (boxId, organisationId, lat, lng, boxTypeId, objectId, userId) => {
  try {
    const updateData = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      position_type: "gps",
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      grid_position: null,
      updated_at: new Date().toISOString()
    };

    if (boxTypeId) updateData.box_type_id = boxTypeId;
    if (objectId) updateData.object_id = objectId;

    const { data, error } = await supabase
      .from("boxes")
      .update(updateData)
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select(`
        *,
        objects ( id, name ),
        box_types ( id, name, category )
      `)
      .single();

    if (error) throw error;

    await logBoxEvent(boxId, userId, "placed_on_map", { lat, lng });

    return { 
      success: true, 
      data: {
        ...data,
        object_name: data.objects?.name,
        box_type_name: data.box_types?.name
      }
    };
  } catch (err) {
    console.error("placeOnMap error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// PLACE ON FLOOR PLAN
// ============================================
exports.placeOnFloorPlan = async (boxId, organisationId, floorPlanId, posX, posY, boxTypeId) => {
  try {
    const updateData = {
      floor_plan_id: floorPlanId,
      pos_x: parseFloat(posX),
      pos_y: parseFloat(posY),
      position_type: "floorplan",
      lat: null,
      lng: null,
      updated_at: new Date().toISOString()
    };

    if (boxTypeId) updateData.box_type_id = boxTypeId;

    const { data, error } = await supabase
      .from("boxes")
      .update(updateData)
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select(`
        *,
        objects ( id, name ),
        box_types ( id, name, category ),
        floor_plans ( id, name )
      `)
      .single();

    if (error) throw error;

    return { 
      success: true, 
      data: {
        ...data,
        object_name: data.objects?.name,
        box_type_name: data.box_types?.name,
        floor_plan_name: data.floor_plans?.name
      }
    };
  } catch (err) {
    console.error("placeOnFloorPlan error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// MOVE TO OBJECT
// ============================================
exports.moveToObject = async (boxId, targetObjectId, organisationId, userId) => {
  try {
    const { data: oldBox } = await supabase
      .from("boxes")
      .select("object_id")
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .single();

    const { data, error } = await supabase
      .from("boxes")
      .update({
        object_id: targetObjectId,
        updated_at: new Date().toISOString()
      })
      .eq("id", boxId)
      .eq("organisation_id", organisationId)
      .select()
      .single();

    if (error) throw error;

    await logBoxEvent(boxId, userId, "moved_to_object", { 
      from_object_id: oldBox?.object_id,
      to_object_id: targetObjectId
    });

    return { success: true, data };
  } catch (err) {
    console.error("moveToObject error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// RENUMBER OBJECT BOXES
// ============================================
exports.renumberObject = async (objectId, organisationId, userId) => {
  try {
    const { data: boxes, error: fetchError } = await supabase
      .from("boxes")
      .select("id, number, qr_code")
      .eq("object_id", objectId)
      .eq("organisation_id", organisationId)
      .neq("status", "archived");

    if (fetchError) throw fetchError;

    if (!boxes || boxes.length === 0) {
      return { success: true, message: "Keine Boxen vorhanden" };
    }

    // Nach QR-Nummer sortieren
    const sorted = [...boxes].sort((a, b) => {
      return extractQrNumber(a.qr_code) - extractQrNumber(b.qr_code);
    });

    // Neu nummerieren: 1, 2, 3, ...
    for (let i = 0; i < sorted.length; i++) {
      await supabase
        .from("boxes")
        .update({ 
          display_number: i + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", sorted[i].id);
    }

    console.log(`✅ ${boxes.length} Boxen in Objekt ${objectId} neu nummeriert`);

    return { success: true, count: boxes.length };
  } catch (err) {
    console.error("renumberObject error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// RENUMBER ALL BOXES
// ============================================
exports.renumberAll = async (organisationId, userId) => {
  try {
    const { data: objects } = await supabase
      .from("objects")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("active", true);

    let totalCount = 0;

    for (const obj of objects || []) {
      const result = await this.renumberObject(obj.id, organisationId, userId);
      if (result.success && result.count) {
        totalCount += result.count;
      }
    }

    return { success: true, count: totalCount };
  } catch (err) {
    console.error("renumberAll error:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// HELPER: Audit Log
// ============================================
async function logBoxEvent(boxId, userId, eventType, details = {}) {
  try {
    await supabase.from("box_events").insert({
      box_id: boxId,
      user_id: userId,
      event_type: eventType,
      details,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
}