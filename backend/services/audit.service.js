/* ============================================================
   TRAPMAP - AUDIT SERVICE
   Speichert alle Box-Änderungen für Compliance
   ============================================================ */

const { supabase } = require("../config/supabase");

/**
 * Audit-Eintrag erstellen
 * @param {Object} params - Audit-Parameter
 * @param {number} params.organisationId - Organisation ID
 * @param {number} params.boxId - Box ID
 * @param {number} params.userId - User ID (wer hat geändert)
 * @param {string} params.action - Aktion (created, moved, type_changed, etc.)
 * @param {Object} params.oldValues - Alte Werte (optional)
 * @param {Object} params.newValues - Neue Werte (optional)
 * @param {number} params.oldLat - Alte Latitude (optional)
 * @param {number} params.oldLng - Alte Longitude (optional)
 * @param {number} params.newLat - Neue Latitude (optional)
 * @param {number} params.newLng - Neue Longitude (optional)
 * @param {string} params.notes - Zusätzliche Notizen (optional)
 * @param {string} params.ipAddress - IP-Adresse (optional)
 * @param {string} params.userAgent - User-Agent (optional)
 */
exports.logBoxChange = async (params) => {
  try {
    const auditEntry = {
      organisation_id: params.organisationId,
      box_id: params.boxId,
      user_id: params.userId || null,
      action: params.action,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      old_lat: params.oldLat || null,
      old_lng: params.oldLng || null,
      new_lat: params.newLat || null,
      new_lng: params.newLng || null,
      notes: params.notes || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null
    };

    const { data, error } = await supabase
      .from("box_audit")
      .insert(auditEntry)
      .select()
      .single();

    if (error) {
      console.error("⚠️ Audit logging failed:", error.message);
      // Nicht abbrechen - Audit-Fehler sollten Operation nicht blockieren
      return { success: false, error: error.message };
    }

    console.log(`📋 Audit: ${params.action} for box ${params.boxId}`);
    return { success: true, data };
  } catch (err) {
    console.error("⚠️ Audit service error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box-Erstellung loggen
 */
exports.logBoxCreated = async (box, userId) => {
  return this.logBoxChange({
    organisationId: box.organisation_id,
    boxId: box.id,
    userId: userId,
    action: "created",
    newValues: {
      qr_code: box.qr_code,
      number: box.number,
      status: box.status
    }
  });
};

/**
 * Box-Verschiebung loggen (GPS)
 */
exports.logBoxMoved = async (boxId, orgId, userId, oldLat, oldLng, newLat, newLng, method = "manual") => {
  return this.logBoxChange({
    organisationId: orgId,
    boxId: boxId,
    userId: userId,
    action: "moved",
    oldLat: oldLat,
    oldLng: oldLng,
    newLat: newLat,
    newLng: newLng,
    notes: method === "gps" ? "GPS-Position gesetzt" : "Position manuell angepasst"
  });
};

/**
 * Box-Typ geändert loggen
 */
exports.logTypeChanged = async (boxId, orgId, userId, oldTypeId, oldTypeName, newTypeId, newTypeName) => {
  return this.logBoxChange({
    organisationId: orgId,
    boxId: boxId,
    userId: userId,
    action: "type_changed",
    oldValues: { box_type_id: oldTypeId, box_type_name: oldTypeName },
    newValues: { box_type_id: newTypeId, box_type_name: newTypeName }
  });
};

/**
 * Box zu Objekt zugewiesen loggen
 */
exports.logBoxAssigned = async (boxId, orgId, userId, oldObjectId, newObjectId, objectName) => {
  return this.logBoxChange({
    organisationId: orgId,
    boxId: boxId,
    userId: userId,
    action: oldObjectId ? "reassigned" : "assigned",
    oldValues: oldObjectId ? { object_id: oldObjectId } : null,
    newValues: { object_id: newObjectId, object_name: objectName }
  });
};

/**
 * Box von Objekt entfernt loggen
 */
exports.logBoxUnassigned = async (boxId, orgId, userId, oldObjectId, objectName) => {
  return this.logBoxChange({
    organisationId: orgId,
    boxId: boxId,
    userId: userId,
    action: "unassigned",
    oldValues: { object_id: oldObjectId, object_name: objectName },
    newValues: { object_id: null }
  });
};

/**
 * Box-Status geändert loggen
 */
exports.logStatusChanged = async (boxId, orgId, userId, oldStatus, newStatus) => {
  return this.logBoxChange({
    organisationId: orgId,
    boxId: boxId,
    userId: userId,
    action: "status_changed",
    oldValues: { status: oldStatus },
    newValues: { status: newStatus }
  });
};

/**
 * Box gelöscht loggen
 */
exports.logBoxDeleted = async (box, userId) => {
  return this.logBoxChange({
    organisationId: box.organisation_id,
    boxId: box.id,
    userId: userId,
    action: "deleted",
    oldValues: {
      qr_code: box.qr_code,
      number: box.number,
      object_id: box.object_id,
      lat: box.lat,
      lng: box.lng
    }
  });
};

/**
 * Köder geändert loggen
 */
exports.logBaitChanged = async (boxId, orgId, userId, oldBait, newBait) => {
  return this.logBoxChange({
    organisationId: orgId,
    boxId: boxId,
    userId: userId,
    action: "bait_changed",
    oldValues: { bait: oldBait },
    newValues: { bait: newBait }
  });
};

/**
 * Audit-History für eine Box abrufen
 */
exports.getBoxAuditHistory = async (boxId, orgId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from("box_audit")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("box_id", boxId)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ Get audit history error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Audit-History für ein Objekt abrufen (alle Boxen)
 */
exports.getObjectAuditHistory = async (objectId, orgId, limit = 100) => {
  try {
    // Erst alle Box-IDs für das Objekt holen
    const { data: boxes } = await supabase
      .from("boxes")
      .select("id")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId);

    if (!boxes || boxes.length === 0) {
      return { success: true, data: [] };
    }

    const boxIds = boxes.map(b => b.id);

    const { data, error } = await supabase
      .from("box_audit")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email
        ),
        boxes:box_id (
          id,
          qr_code,
          number
        )
      `)
      .in("box_id", boxIds)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ Get object audit history error:", err.message);
    return { success: false, error: err.message };
  }
};