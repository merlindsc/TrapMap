// ============================================
// SCANS SERVICE - KOMPLETT
// GPS wird NUR aktualisiert wenn update_gps === true
// ============================================

const { supabase } = require("../config/supabase");

// ============================================
// GET HISTORY FOR BOX
// ============================================
exports.getHistoryForBox = async (boxId, orgId) => {
  try {
    const { data, error } = await supabase
      .from("scans")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("organisation_id", orgId)
      .eq("box_id", boxId)
      .order("scanned_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase ERROR (getHistoryForBox):", error);
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in getHistoryForBox:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET HISTORY FOR OBJECT
// ============================================
exports.getHistoryForObject = async (objectId, orgId) => {
  try {
    const { data: boxes, error: boxErr } = await supabase
      .from("boxes")
      .select("id")
      .eq("organisation_id", orgId)
      .eq("object_id", objectId);

    if (boxErr) {
      console.error("❌ Supabase ERROR (load boxes):", boxErr);
      throw boxErr;
    }

    const boxIds = boxes.map((b) => b.id);

    if (boxIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from("scans")
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
          number,
          notes
        )
      `)
      .eq("organisation_id", orgId)
      .in("box_id", boxIds)
      .order("scanned_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase ERROR (getHistoryForObject):", error);
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in getHistoryForObject:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// CREATE SCAN
// GPS nur für Boxen OHNE floor_plan_id UND nur wenn update_gps === true!
// ============================================
exports.create = async (payload, orgId) => {
  try {
    // Validierung
    if (!payload.box_id) {
      return { success: false, message: "box_id ist erforderlich" };
    }
    if (!payload.status) {
      return { success: false, message: "status ist erforderlich" };
    }

    // Parse quantity - extract first number from range strings like "10-20" or "20+"
    let quantityValue = null;
    if (payload.quantity) {
      const match = String(payload.quantity).match(/\d+/);
      if (match) {
        quantityValue = parseInt(match[0]);
      }
    }

    // Parse consumption as float if present
    let consumptionValue = null;
    if (payload.consumption !== null && payload.consumption !== undefined && payload.consumption !== '') {
      const parsed = parseFloat(payload.consumption);
      if (!isNaN(parsed)) {
        consumptionValue = parsed;
      }
    }

    const scan = {
      organisation_id: orgId,
      box_id: parseInt(payload.box_id),
      user_id: payload.user_id || null,
      status: payload.status,
      notes: payload.notes || null,
      findings: payload.findings || null,
      consumption: consumptionValue,
      quantity: quantityValue,
      trap_state: payload.trap_state || null,
      photo_url: payload.photo_url || null,
      scanned_at: new Date().toISOString()
    };

    // GPS-Koordinaten zum Scan hinzufügen falls vorhanden
    // (Scan speichert IMMER die GPS-Position zum Zeitpunkt des Scans)
    if (payload.latitude && payload.longitude) {
      scan.latitude = parseFloat(payload.latitude);
      scan.longitude = parseFloat(payload.longitude);
    }

    const { data, error } = await supabase
      .from("scans")
      .insert(scan)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase ERROR (create scan):", error);
      throw error;
    }

    // ============================================
    // BOX UPDATE
    // GPS NUR wenn:
    // 1. Box hat KEINE floor_plan_id (= GPS-Box auf Karte)
    // 2. GPS-Koordinaten wurden mitgeschickt
    // 3. NEU: update_gps === true (explizite Anforderung!)
    // ============================================
    
    // Erst Box laden um floor_plan_id zu prüfen
    const { data: boxData, error: boxFetchError } = await supabase
      .from("boxes")
      .select("id, floor_plan_id, pos_x, pos_y, grid_position, lat, lng")
      .eq("id", parseInt(payload.box_id))
      .eq("organisation_id", orgId)
      .single();

    if (boxFetchError) {
      console.error("⚠️ Warning: Could not fetch box:", boxFetchError);
    }

    // Update-Objekt vorbereiten - Status und last_scan IMMER aktualisieren
    const boxUpdate = {
      current_status: payload.status,
      last_scan: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // ============================================
    // GPS NUR aktualisieren wenn ALLE Bedingungen erfüllt:
    // 1. Box hat KEINE floor_plan_id (= GPS-Box, nicht Lageplan)
    // 2. GPS-Koordinaten wurden mitgeschickt
    // 3. update_gps === true (User hat explizit Button gedrückt!)
    // ============================================
    if (boxData && !boxData.floor_plan_id && payload.latitude && payload.longitude && payload.update_gps === true) {
      boxUpdate.lat = parseFloat(payload.latitude);
      boxUpdate.lng = parseFloat(payload.longitude);
    }

    const { error: boxError } = await supabase
      .from("boxes")
      .update(boxUpdate)
      .eq("id", parseInt(payload.box_id))
      .eq("organisation_id", orgId);

    if (boxError) {
      console.error("⚠️ Warning: Could not update box status:", boxError);
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in create():", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET RECENT SCANS (für Dashboard)
// ============================================
exports.getRecent = async (orgId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from("scans")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name
        ),
        boxes:box_id (
          id,
          number,
          object_id,
          objects:object_id (
            id,
            name
          )
        )
      `)
      .eq("organisation_id", orgId)
      .order("scanned_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ Supabase ERROR (getRecent):", error);
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in getRecent:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET SCANS BY DATE RANGE
// ============================================
exports.getByDateRange = async (orgId, startDate, endDate, objectId = null) => {
  try {
    let query = supabase
      .from("scans")
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name
        ),
        boxes:box_id (
          id,
          number,
          object_id,
          objects:object_id (
            id,
            name
          )
        )
      `)
      .eq("organisation_id", orgId)
      .gte("scanned_at", startDate)
      .lte("scanned_at", endDate)
      .order("scanned_at", { ascending: false });

    if (objectId) {
      // Filter by object - need to get box IDs first
      const { data: boxes } = await supabase
        .from("boxes")
        .select("id")
        .eq("object_id", objectId)
        .eq("organisation_id", orgId);
      
      if (boxes && boxes.length > 0) {
        const boxIds = boxes.map(b => b.id);
        query = query.in("box_id", boxIds);
      } else {
        return { success: true, data: [] };
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase ERROR (getByDateRange):", error);
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in getByDateRange:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET SCAN STATISTICS
// ============================================
exports.getStatistics = async (orgId, days = 30) => {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabase
      .from("scans")
      .select("status, scanned_at")
      .eq("organisation_id", orgId)
      .gte("scanned_at", since);

    if (error) {
      console.error("❌ Supabase ERROR (getStatistics):", error);
      throw error;
    }

    // Status-Verteilung berechnen
    const statusCounts = {};
    const dailyCounts = {};

    data.forEach(scan => {
      // Status zählen
      statusCounts[scan.status] = (statusCounts[scan.status] || 0) + 1;
      
      // Tägliche Counts
      const day = scan.scanned_at.split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    return {
      success: true,
      data: {
        total: data.length,
        byStatus: statusCounts,
        byDay: dailyCounts
      }
    };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in getStatistics:", err);
    return { success: false, message: err.message };
  }
};