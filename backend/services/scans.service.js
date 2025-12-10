const { supabase } = require("../config/supabase");

// --------------------------------------------------------
// GET HISTORY FOR BOX
// --------------------------------------------------------
exports.getHistoryForBox = async (boxId, orgId) => {
  try {
    console.log("🔍 Loading scans for box:", boxId);

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

// --------------------------------------------------------
// GET HISTORY FOR OBJECT
// --------------------------------------------------------
exports.getHistoryForObject = async (objectId, orgId) => {
  try {
    console.log("🔍 Loading scans for object:", objectId);

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
      console.log("ℹ️ No boxes for this object.");
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

// --------------------------------------------------------
// CREATE SCAN
// --------------------------------------------------------
exports.create = async (payload, orgId) => {
  try {
    console.log("🟢 Creating scan with payload:", payload);

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

    console.log("📝 Insert scan:", scan);

    const { data, error } = await supabase
      .from("scans")
      .insert(scan)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase ERROR (create scan):", error);
      throw error;
    }

    // Update box status
    const { error: boxError } = await supabase
      .from("boxes")
      .update({
        current_status: payload.status,
        last_scan: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", parseInt(payload.box_id))
      .eq("organisation_id", orgId);

    if (boxError) {
      console.error("⚠️ Warning: Could not update box status:", boxError);
      // Nicht abbrechen - Scan wurde erstellt
    } else {
      console.log("✅ Box status updated to:", payload.status);
    }

    return { success: true, data };
  } catch (err) {
    console.error("❌ UNHANDLED ERROR in create():", err);
    return { success: false, message: err.message };
  }
};

// --------------------------------------------------------
// GET RECENT SCANS (für Dashboard)
// --------------------------------------------------------
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