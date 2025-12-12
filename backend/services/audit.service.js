/* ============================================================
   TRAPMAP - AUDIT SERVICE (ERWEITERT)
   Vollständiges Audit-Logging für HACCP/IFS Compliance
   
   Features:
   - Alle Box-Änderungen (Position, Typ, Zuweisung)
   - Alle Scans mit Details
   - User-Aktivitäten (Login, Logout, etc.)
   - Report-Generierung
   - Automatische Retention basierend auf Org-Settings
   ============================================================ */

const { supabase } = require("../config/supabase");

// ============================================
// KATEGORIEN & AKTIONEN
// ============================================
const CATEGORIES = {
  BOX: "box",
  SCAN: "scan",
  USER: "user",
  OBJECT: "object",
  LAYOUT: "layout",
  PARTNER: "partner",
  REPORT: "report",
  SYSTEM: "system",
  ADMIN: "admin"
};

const SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical"
};

const ACTIONS = {
  // Box Actions
  BOX_CREATED: "box_created",
  BOX_UPDATED: "box_updated",
  BOX_DELETED: "box_deleted",
  BOX_MOVED: "box_moved",
  BOX_ASSIGNED: "box_assigned",
  BOX_UNASSIGNED: "box_unassigned",
  BOX_REASSIGNED: "box_reassigned",
  BOX_TYPE_CHANGED: "box_type_changed",
  BOX_BAIT_CHANGED: "box_bait_changed",
  BOX_PLACED_MAP: "box_placed_map",
  BOX_PLACED_FLOORPLAN: "box_placed_floorplan",
  BOX_REMOVED_FLOORPLAN: "box_removed_floorplan",
  
  // Scan Actions
  SCAN_CREATED: "scan_created",
  SCAN_UPDATED: "scan_updated",
  SCAN_DELETED: "scan_deleted",
  SCAN_PHOTO_ADDED: "scan_photo_added",
  SCAN_FINDING_CRITICAL: "scan_finding_critical",
  
  // User Actions
  USER_LOGIN: "user_login",
  USER_LOGOUT: "user_logout",
  USER_LOGIN_FAILED: "user_login_failed",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  USER_PASSWORD_CHANGED: "user_password_changed",
  USER_PASSWORD_RESET: "user_password_reset",
  USER_ROLE_CHANGED: "user_role_changed",
  
  // Object Actions
  OBJECT_CREATED: "object_created",
  OBJECT_UPDATED: "object_updated",
  OBJECT_DELETED: "object_deleted",
  OBJECT_GPS_CHANGED: "object_gps_changed",
  
  // Layout Actions
  LAYOUT_CREATED: "layout_created",
  LAYOUT_UPDATED: "layout_updated",
  LAYOUT_DELETED: "layout_deleted",
  LAYOUT_IMAGE_UPLOADED: "layout_image_uploaded",
  
  // Partner Actions
  PARTNER_CREATED: "partner_created",
  PARTNER_LOGIN: "partner_login",
  PARTNER_SCAN: "partner_scan",
  PARTNER_DELETED: "partner_deleted",
  
  // Report Actions
  REPORT_GENERATED: "report_generated",
  REPORT_EXPORTED: "report_exported",
  
  // System Actions
  SETTINGS_CHANGED: "settings_changed",
  RETENTION_CHANGED: "retention_changed",
  DATA_EXPORTED: "data_exported",
  DATA_CLEANUP: "data_cleanup"
};

// ============================================
// HAUPT-LOGGING FUNKTION
// ============================================
/**
 * Erstellt einen Audit-Eintrag
 * @param {Object} params - Audit-Parameter
 * @returns {Object} - {success, data, error}
 */
const log = async (params) => {
  try {
    const {
      organisationId,
      userId = null,
      partnerId = null,
      action,
      category = CATEGORIES.SYSTEM,
      severity = SEVERITY.INFO,
      entityType,
      entityId = null,
      entityName = null,
      oldValues = null,
      newValues = null,
      details = null,
      metadata = null,
      ipAddress = null,
      userAgent = null,
      requestId = null
    } = params;

    if (!organisationId || !action || !entityType) {
      console.warn("⚠️ Audit log missing required fields:", { organisationId, action, entityType });
      return { success: false, error: "Missing required fields" };
    }

    const entry = {
      organisation_id: organisationId,
      user_id: userId,
      partner_id: partnerId,
      action,
      category,
      severity,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_values: oldValues,
      new_values: newValues,
      details,
      metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId
      // expires_at wird via Trigger automatisch gesetzt
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

    // Bei kritischen Events: Console-Log
    if (severity === SEVERITY.CRITICAL) {
      console.log(`🚨 CRITICAL AUDIT: ${action} - ${entityType} ${entityId} - Org ${organisationId}`);
    } else {
      console.log(`📋 Audit: ${action} | ${entityType} ${entityId || ""}`);
    }

    return { success: true, data };
  } catch (err) {
    console.error("⚠️ Audit service error:", err.message);
    return { success: false, error: err.message };
  }
};

// ============================================
// BOX AUDIT FUNKTIONEN
// ============================================

/**
 * Box erstellt
 */
const logBoxCreated = async (box, orgId, userId, metadata = {}) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.BOX_CREATED,
    category: CATEGORIES.BOX,
    entityType: "box",
    entityId: box.id,
    entityName: box.notes || `Box ${box.number}`,
    newValues: {
      number: box.number,
      qr_code: box.qr_code,
      box_type_id: box.box_type_id,
      object_id: box.object_id
    },
    metadata
  });
};

/**
 * Box aktualisiert
 */
const logBoxUpdated = async (boxId, orgId, userId, oldValues, newValues, details = null) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.BOX_UPDATED,
    category: CATEGORIES.BOX,
    entityType: "box",
    entityId: boxId,
    oldValues,
    newValues,
    details
  });
};

/**
 * Box gelöscht (soft delete)
 */
const logBoxDeleted = async (box, orgId, userId, reason = null) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.BOX_DELETED,
    category: CATEGORIES.BOX,
    severity: SEVERITY.WARNING,
    entityType: "box",
    entityId: box.id,
    entityName: box.notes || `Box ${box.number}`,
    oldValues: {
      number: box.number,
      object_id: box.object_id,
      qr_code: box.qr_code
    },
    details: reason
  });
};

/**
 * Box-Position geändert (GPS/Karte)
 */
const logBoxMoved = async (boxId, orgId, userId, oldLat, oldLng, newLat, newLng, method = "manual", reason = null, photoUrl = null) => {
  try {
    // In box_location_history speichern
    await supabase
      .from("box_location_history")
      .insert({
        box_id: boxId,
        organisation_id: orgId,
        user_id: userId,
        old_lat: oldLat,
        old_lng: oldLng,
        new_lat: newLat,
        new_lng: newLng,
        method,
        reason,
        photo_url: photoUrl
      });

    // Auch in audit_log
    return log({
      organisationId: orgId,
      userId,
      action: ACTIONS.BOX_MOVED,
      category: CATEGORIES.BOX,
      entityType: "box",
      entityId: boxId,
      oldValues: { lat: oldLat, lng: oldLng },
      newValues: { lat: newLat, lng: newLng },
      details: method === "gps" ? "GPS-Position aktualisiert" : `Position manuell geändert: ${reason || ""}`,
      metadata: { method, photo_url: photoUrl }
    });
  } catch (err) {
    console.error("⚠️ logBoxMoved error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box auf Lageplan verschoben
 */
const logBoxMovedFloorplan = async (boxId, orgId, userId, floorPlanId, oldX, oldY, newX, newY) => {
  try {
    await supabase
      .from("box_location_history")
      .insert({
        box_id: boxId,
        organisation_id: orgId,
        user_id: userId,
        old_floor_plan_id: floorPlanId,
        old_floor_x: oldX,
        old_floor_y: oldY,
        new_floor_plan_id: floorPlanId,
        new_floor_x: newX,
        new_floor_y: newY,
        method: "drag_drop"
      });

    return log({
      organisationId: orgId,
      userId,
      action: ACTIONS.BOX_PLACED_FLOORPLAN,
      category: CATEGORIES.BOX,
      entityType: "box",
      entityId: boxId,
      oldValues: { floor_x: oldX, floor_y: oldY },
      newValues: { floor_x: newX, floor_y: newY },
      metadata: { floor_plan_id: floorPlanId }
    });
  } catch (err) {
    console.error("⚠️ logBoxMovedFloorplan error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box einem Objekt zugewiesen
 */
const logBoxAssigned = async (boxId, orgId, userId, oldObjectId, newObjectId, objectName, reason = null, photoUrl = null) => {
  try {
    // Hole alten Objekt-Namen
    let oldObjectName = null;
    if (oldObjectId) {
      const { data: oldObj } = await supabase
        .from("objects")
        .select("name")
        .eq("id", oldObjectId)
        .single();
      oldObjectName = oldObj?.name;
    }

    // In assignment_history speichern
    await supabase
      .from("box_assignment_history")
      .insert({
        box_id: boxId,
        organisation_id: orgId,
        user_id: userId,
        action: oldObjectId ? "moved" : "assigned",
        old_object_id: oldObjectId,
        old_object_name: oldObjectName,
        new_object_id: newObjectId,
        new_object_name: objectName,
        reason,
        photo_url: photoUrl
      });

    return log({
      organisationId: orgId,
      userId,
      action: oldObjectId ? ACTIONS.BOX_REASSIGNED : ACTIONS.BOX_ASSIGNED,
      category: CATEGORIES.BOX,
      entityType: "box",
      entityId: boxId,
      oldValues: oldObjectId ? { object_id: oldObjectId, object_name: oldObjectName } : null,
      newValues: { object_id: newObjectId, object_name: objectName },
      details: reason,
      metadata: { photo_url: photoUrl }
    });
  } catch (err) {
    console.error("⚠️ logBoxAssigned error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box von Objekt entfernt (zurück in Pool)
 */
const logBoxUnassigned = async (boxId, orgId, userId, oldObjectId, objectName, reason = null) => {
  try {
    await supabase
      .from("box_assignment_history")
      .insert({
        box_id: boxId,
        organisation_id: orgId,
        user_id: userId,
        action: "unassigned",
        old_object_id: oldObjectId,
        old_object_name: objectName,
        new_object_id: null,
        new_object_name: null,
        reason
      });

    return log({
      organisationId: orgId,
      userId,
      action: ACTIONS.BOX_UNASSIGNED,
      category: CATEGORIES.BOX,
      entityType: "box",
      entityId: boxId,
      oldValues: { object_id: oldObjectId, object_name: objectName },
      newValues: { object_id: null },
      details: reason
    });
  } catch (err) {
    console.error("⚠️ logBoxUnassigned error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Box-Typ geändert
 */
const logTypeChanged = async (boxId, orgId, userId, oldTypeId, oldTypeName, newTypeId, newTypeName) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.BOX_TYPE_CHANGED,
    category: CATEGORIES.BOX,
    entityType: "box",
    entityId: boxId,
    oldValues: { box_type_id: oldTypeId, type_name: oldTypeName },
    newValues: { box_type_id: newTypeId, type_name: newTypeName }
  });
};

/**
 * Köder geändert
 */
const logBaitChanged = async (boxId, orgId, userId, oldBait, newBait) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.BOX_BAIT_CHANGED,
    category: CATEGORIES.BOX,
    entityType: "box",
    entityId: boxId,
    oldValues: { bait: oldBait },
    newValues: { bait: newBait }
  });
};

// ============================================
// SCAN AUDIT FUNKTIONEN
// ============================================

/**
 * Scan erstellt
 */
const logScanCreated = async (scan, orgId, userId, deviceInfo = {}) => {
  const severity = scan.status === "red" || scan.pest_found ? SEVERITY.WARNING : SEVERITY.INFO;
  
  // In scan_audit Details speichern
  if (Object.keys(deviceInfo).length > 0) {
    await supabase
      .from("scan_audit")
      .insert({
        scan_id: scan.id,
        organisation_id: orgId,
        device_type: deviceInfo.device_type,
        device_model: deviceInfo.device_model,
        app_version: deviceInfo.app_version,
        gps_accuracy: deviceInfo.gps_accuracy,
        gps_timestamp: deviceInfo.gps_timestamp,
        photo_taken_at: deviceInfo.photo_taken_at,
        offline_created: deviceInfo.offline || false
      });
  }

  return log({
    organisationId: orgId,
    userId,
    action: scan.pest_found ? ACTIONS.SCAN_FINDING_CRITICAL : ACTIONS.SCAN_CREATED,
    category: CATEGORIES.SCAN,
    severity,
    entityType: "scan",
    entityId: scan.id,
    newValues: {
      box_id: scan.box_id,
      status: scan.status,
      findings: scan.findings,
      pest_found: scan.pest_found,
      pest_count: scan.pest_count,
      notes: scan.notes,
      photo_url: scan.photo_url
    },
    metadata: {
      scanned_at: scan.scanned_at,
      ...deviceInfo
    }
  });
};

// ============================================
// USER AUDIT FUNKTIONEN
// ============================================

/**
 * User Login
 */
const logUserLogin = async (user, orgId, ip, userAgent, success = true, failReason = null) => {
  // In user_activity_log
  await supabase
    .from("user_activity_log")
    .insert({
      organisation_id: orgId,
      user_id: user?.id,
      activity: success ? "login" : "login_failed",
      success,
      failure_reason: failReason,
      ip_address: ip,
      user_agent: userAgent
    });

  return log({
    organisationId: orgId || 0,
    userId: user?.id,
    action: success ? ACTIONS.USER_LOGIN : ACTIONS.USER_LOGIN_FAILED,
    category: CATEGORIES.USER,
    severity: success ? SEVERITY.INFO : SEVERITY.WARNING,
    entityType: "user",
    entityId: user?.id,
    entityName: user?.email,
    details: failReason,
    ipAddress: ip,
    userAgent
  });
};

/**
 * User Logout
 */
const logUserLogout = async (userId, orgId, ip) => {
  await supabase
    .from("user_activity_log")
    .insert({
      organisation_id: orgId,
      user_id: userId,
      activity: "logout",
      ip_address: ip
    });

  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.USER_LOGOUT,
    category: CATEGORIES.USER,
    entityType: "user",
    entityId: userId,
    ipAddress: ip
  });
};

/**
 * User erstellt
 */
const logUserCreated = async (newUser, orgId, createdByUserId) => {
  return log({
    organisationId: orgId,
    userId: createdByUserId,
    action: ACTIONS.USER_CREATED,
    category: CATEGORIES.USER,
    entityType: "user",
    entityId: newUser.id,
    entityName: newUser.email,
    newValues: {
      email: newUser.email,
      role: newUser.role,
      first_name: newUser.first_name,
      last_name: newUser.last_name
    }
  });
};

/**
 * User Passwort geändert
 */
const logPasswordChanged = async (userId, orgId, changedByUserId, method = "self") => {
  await supabase
    .from("user_activity_log")
    .insert({
      organisation_id: orgId,
      user_id: userId,
      activity: "password_change"
    });

  return log({
    organisationId: orgId,
    userId: changedByUserId,
    action: ACTIONS.USER_PASSWORD_CHANGED,
    category: CATEGORIES.USER,
    severity: SEVERITY.INFO,
    entityType: "user",
    entityId: userId,
    metadata: { method }
  });
};

/**
 * User Rolle geändert
 */
const logRoleChanged = async (userId, orgId, changedByUserId, oldRole, newRole) => {
  return log({
    organisationId: orgId,
    userId: changedByUserId,
    action: ACTIONS.USER_ROLE_CHANGED,
    category: CATEGORIES.USER,
    severity: SEVERITY.WARNING,
    entityType: "user",
    entityId: userId,
    oldValues: { role: oldRole },
    newValues: { role: newRole }
  });
};

// ============================================
// OBJECT AUDIT FUNKTIONEN
// ============================================

/**
 * Object erstellt
 */
const logObjectCreated = async (object, orgId, userId) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.OBJECT_CREATED,
    category: CATEGORIES.OBJECT,
    entityType: "object",
    entityId: object.id,
    entityName: object.name,
    newValues: {
      name: object.name,
      address: object.address,
      lat: object.lat,
      lng: object.lng
    }
  });
};

/**
 * Object aktualisiert
 */
const logObjectUpdated = async (objectId, orgId, userId, oldValues, newValues) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.OBJECT_UPDATED,
    category: CATEGORIES.OBJECT,
    entityType: "object",
    entityId: objectId,
    oldValues,
    newValues
  });
};

/**
 * Object gelöscht
 */
const logObjectDeleted = async (object, orgId, userId) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.OBJECT_DELETED,
    category: CATEGORIES.OBJECT,
    severity: SEVERITY.WARNING,
    entityType: "object",
    entityId: object.id,
    entityName: object.name,
    oldValues: {
      name: object.name,
      address: object.address,
      box_count: object.box_count
    }
  });
};

// ============================================
// PARTNER AUDIT FUNKTIONEN
// ============================================

/**
 * Partner Login
 */
const logPartnerLogin = async (partner, orgId, ip, userAgent, success = true) => {
  await supabase
    .from("user_activity_log")
    .insert({
      organisation_id: orgId,
      partner_id: partner?.id,
      activity: success ? "partner_login" : "partner_login_failed",
      success,
      ip_address: ip,
      user_agent: userAgent
    });

  return log({
    organisationId: orgId,
    partnerId: partner?.id,
    action: ACTIONS.PARTNER_LOGIN,
    category: CATEGORIES.PARTNER,
    entityType: "partner",
    entityId: partner?.id,
    entityName: partner?.email,
    ipAddress: ip,
    userAgent
  });
};

/**
 * Partner Scan
 */
const logPartnerScan = async (scan, partnerId, orgId) => {
  return log({
    organisationId: orgId,
    partnerId,
    action: ACTIONS.PARTNER_SCAN,
    category: CATEGORIES.PARTNER,
    entityType: "scan",
    entityId: scan.id,
    newValues: {
      box_id: scan.box_id,
      status: scan.status
    }
  });
};

// ============================================
// REPORT AUDIT FUNKTIONEN
// ============================================

/**
 * Report generiert
 */
const logReportGenerated = async (reportType, orgId, userId, filters, recordCount) => {
  // In audit_export_log
  await supabase
    .from("audit_export_log")
    .insert({
      organisation_id: orgId,
      user_id: userId,
      export_type: reportType,
      format: "pdf",
      filters,
      record_count: recordCount
    });

  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.REPORT_GENERATED,
    category: CATEGORIES.REPORT,
    entityType: "report",
    metadata: { report_type: reportType, filters, record_count: recordCount }
  });
};

// ============================================
// SETTINGS AUDIT FUNKTIONEN
// ============================================

/**
 * Retention geändert
 */
const logRetentionChanged = async (orgId, userId, oldYears, newYears) => {
  return log({
    organisationId: orgId,
    userId,
    action: ACTIONS.RETENTION_CHANGED,
    category: CATEGORIES.SYSTEM,
    severity: SEVERITY.WARNING,
    entityType: "settings",
    oldValues: { retention_years: oldYears },
    newValues: { retention_years: newYears }
  });
};

// ============================================
// ABFRAGE FUNKTIONEN
// ============================================

/**
 * Audit-History für eine Box abrufen
 */
const getBoxHistory = async (boxId, orgId, limit = 100) => {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select(`
        *,
        users:user_id (id, first_name, last_name, email)
      `)
      .eq("entity_type", "box")
      .eq("entity_id", boxId)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ getBoxHistory error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Vollständige Box-Historie (inkl. Location & Assignment)
 */
const getBoxFullHistory = async (boxId, orgId, limit = 100) => {
  try {
    const [auditRes, locationRes, assignmentRes] = await Promise.all([
      supabase
        .from("audit_log")
        .select("*, users:user_id (first_name, last_name)")
        .eq("entity_type", "box")
        .eq("entity_id", boxId)
        .eq("organisation_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit),
      
      supabase
        .from("box_location_history")
        .select("*, users:user_id (first_name, last_name)")
        .eq("box_id", boxId)
        .eq("organisation_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit),
      
      supabase
        .from("box_assignment_history")
        .select("*, users:user_id (first_name, last_name)")
        .eq("box_id", boxId)
        .eq("organisation_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit)
    ]);

    return {
      success: true,
      data: {
        audit: auditRes.data || [],
        locations: locationRes.data || [],
        assignments: assignmentRes.data || []
      }
    };
  } catch (err) {
    console.error("❌ getBoxFullHistory error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Location-History für eine Box
 */
const getBoxLocationHistory = async (boxId, orgId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from("box_location_history")
      .select(`
        *,
        users:user_id (id, first_name, last_name)
      `)
      .eq("box_id", boxId)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ getBoxLocationHistory error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Audit-Logs für Organisation abrufen (mit Filtern)
 */
const getAuditLogs = async (orgId, filters = {}) => {
  try {
    let query = supabase
      .from("audit_log")
      .select(`
        *,
        users:user_id (id, first_name, last_name, email),
        partners:partner_id (id, name, company)
      `)
      .eq("organisation_id", orgId);

    // Filter anwenden
    if (filters.category) {
      query = query.eq("category", filters.category);
    }
    if (filters.entityType) {
      query = query.eq("entity_type", filters.entityType);
    }
    if (filters.entityId) {
      query = query.eq("entity_id", filters.entityId);
    }
    if (filters.action) {
      query = query.eq("action", filters.action);
    }
    if (filters.severity) {
      query = query.eq("severity", filters.severity);
    }
    if (filters.userId) {
      query = query.eq("user_id", filters.userId);
    }
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate + "T23:59:59");
    }

    // Sortierung & Limit
    query = query
      .order("created_at", { ascending: false })
      .limit(filters.limit || 100);

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { success: true, data, count };
  } catch (err) {
    console.error("❌ getAuditLogs error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * User Activity abrufen
 */
const getUserActivity = async (orgId, userId = null, limit = 100) => {
  try {
    let query = supabase
      .from("user_activity_log")
      .select("*")
      .eq("organisation_id", orgId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("❌ getUserActivity error:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Audit-Statistiken
 */
const getAuditStats = async (orgId, days = 30) => {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [totalRes, categoryRes, severityRes, topActionsRes] = await Promise.all([
      // Gesamt
      supabase
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", orgId)
        .gte("created_at", since),
      
      // Nach Kategorie
      supabase
        .from("audit_log")
        .select("category")
        .eq("organisation_id", orgId)
        .gte("created_at", since),
      
      // Nach Severity
      supabase
        .from("audit_log")
        .select("severity")
        .eq("organisation_id", orgId)
        .gte("created_at", since),
      
      // Top Aktionen
      supabase
        .from("audit_log")
        .select("action")
        .eq("organisation_id", orgId)
        .gte("created_at", since)
    ]);

    // Kategorien zählen
    const categoryCounts = {};
    (categoryRes.data || []).forEach(row => {
      categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    });

    // Severity zählen
    const severityCounts = {};
    (severityRes.data || []).forEach(row => {
      severityCounts[row.severity] = (severityCounts[row.severity] || 0) + 1;
    });

    // Top Actions
    const actionCounts = {};
    (topActionsRes.data || []).forEach(row => {
      actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
    });
    const topActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      success: true,
      data: {
        total: totalRes.count || 0,
        byCategory: categoryCounts,
        bySeverity: severityCounts,
        topActions,
        period: { days, since }
      }
    };
  } catch (err) {
    console.error("❌ getAuditStats error:", err.message);
    return { success: false, error: err.message };
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Konstanten
  CATEGORIES,
  SEVERITY,
  ACTIONS,
  
  // Haupt-Funktion
  log,
  
  // Box
  logBoxCreated,
  logBoxUpdated,
  logBoxDeleted,
  logBoxMoved,
  logBoxMovedFloorplan,
  logBoxAssigned,
  logBoxUnassigned,
  logTypeChanged,
  logBaitChanged,
  
  // Scan
  logScanCreated,
  
  // User
  logUserLogin,
  logUserLogout,
  logUserCreated,
  logPasswordChanged,
  logRoleChanged,
  
  // Object
  logObjectCreated,
  logObjectUpdated,
  logObjectDeleted,
  
  // Partner
  logPartnerLogin,
  logPartnerScan,
  
  // Report
  logReportGenerated,
  
  // Settings
  logRetentionChanged,
  
  // Abfragen
  getBoxHistory,
  getBoxFullHistory,
  getBoxLocationHistory,
  getAuditLogs,
  getUserActivity,
  getAuditStats
};