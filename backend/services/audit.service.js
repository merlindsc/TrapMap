/* ============================================================
   TRAPMAP - AUDIT SERVICE
   Nutzt bestehende Tabellen: audit_log, box_location_history
   ============================================================ */

const { supabase } = require("../config/supabase");

/**
 * Allgemeinen Audit-Eintrag erstellen
 */
exports.log = async (params) => {
  try {
    const entry = {
      organisation_id: params.organisationId,
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType || "box",  // box, object, user, etc.
      entity_id: params.entityId,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      details: params.details || null,
      ip_address: params.ipAddress || null
    };

    const { data, error } = await supabase
      .from("audit_log")
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error("⚠️ Audit log failed:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`📋 Audit: ${params.action} for ${params.entityType} ${params.entityId}`);
    return { success: true, data };
  } catch (err) {
    console.error("⚠️ Audit service error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box-Verschiebung in box_location_history loggen
 */
exports.logBoxMoved = async (boxId, orgId, userId, oldLat, oldLng, newLat, newLng, method = "manual") => {
  try {
    // In box_location_history speichern
    const { error } = await supabase
      .from("box_location_history")
      .insert({
        box_id: boxId,
        organisation_id: orgId,
        user_id: userId,
        old_lat: oldLat,
        old_lng: oldLng,
        new_lat: newLat,
        new_lng: newLng,
        method: method,  // 'manual', 'gps', 'drag_drop'
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("⚠️ Location history failed:", error.message);
      // Nicht abbrechen - nur loggen
    }

    // Auch in audit_log
    await this.log({
      organisationId: orgId,
      userId: userId,
      action: "box_moved",
      entityType: "box",
      entityId: boxId,
      oldValues: { lat: oldLat, lng: oldLng },
      newValues: { lat: newLat, lng: newLng },
      details: method === "gps" ? "GPS-Position gesetzt" : "Position manuell angepasst"
    });

    return { success: true };
  } catch (err) {
    console.error("⚠️ logBoxMoved error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box-Typ geändert
 */
exports.logTypeChanged = async (boxId, orgId, userId, oldTypeId, oldTypeName, newTypeId, newTypeName) => {
  return this.log({
    organisationId: orgId,
    userId: userId,
    action: "box_type_changed",
    entityType: "box",
    entityId: boxId,
    oldValues: { box_type_id: oldTypeId, name: oldTypeName },
    newValues: { box_type_id: newTypeId, name: newTypeName }
  });
};

/**
 * Box zu Objekt zugewiesen
 */
exports.logBoxAssigned = async (boxId, orgId, userId, oldObjectId, newObjectId, objectName) => {
  return this.log({
    organisationId: orgId,
    userId: userId,
    action: oldObjectId ? "box_reassigned" : "box_assigned",
    entityType: "box",
    entityId: boxId,
    oldValues: oldObjectId ? { object_id: oldObjectId } : null,
    newValues: { object_id: newObjectId, object_name: objectName }
  });
};

/**
 * Box von Objekt entfernt
 */
exports.logBoxUnassigned = async (boxId, orgId, userId, oldObjectId, objectName) => {
  return this.log({
    organisationId: orgId,
    userId: userId,
    action: "box_unassigned",
    entityType: "box",
    entityId: boxId,
    oldValues: { object_id: oldObjectId, object_name: objectName },
    newValues: { object_id: null }
  });
};

/**
 * Köder geändert
 */
exports.logBaitChanged = async (boxId, orgId, userId, oldBait, newBait) => {
  return this.log({
    organisationId: orgId,
    userId: userId,
    action: "bait_changed",
    entityType: "box",
    entityId: boxId,
    oldValues: { bait: oldBait },
    newValues: { bait: newBait }
  });
};

/**
 * Audit-History für eine Box abrufen
 */
exports.getBoxHistory = async (boxId, orgId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("entity_type", "box")
      .eq("entity_id", boxId)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ Get box history error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Location-History für eine Box abrufen
 */
exports.getBoxLocationHistory = async (boxId, orgId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from("box_location_history")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("box_id", boxId)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ Get location history error:", err.message);
    return { success: false, error: err.message };
  }
};