// ============================================
// DASHBOARD SERVICE - KOMPLETT
// KPIs + Recent Scans
// ============================================

const { supabase } = require("../config/supabase");

// ============================================
// GET STATS (KPIs für Dashboard)
// ============================================
exports.getStats = async (organisation_id) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    weekAgo.setHours(0, 0, 0, 0);
    const weekAgoStr = weekAgo.toISOString();

    // 1. Anzahl aktive Boxen
    const { count: boxCount, error: boxError } = await supabase
      .from("boxes")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisation_id)
      .eq("active", true);

    if (boxError) console.error("Box count error:", boxError);

    // 2. Scans heute
    const { count: todayScansCount, error: todayError } = await supabase
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisation_id)
      .gte("scanned_at", todayStr);

    if (todayError) console.error("Today scans error:", todayError);

    // 3. Scans diese Woche
    const { count: weekScansCount, error: weekError } = await supabase
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisation_id)
      .gte("scanned_at", weekAgoStr);

    if (weekError) console.error("Week scans error:", weekError);

    // 4. Status-Zählung nach current_status
    const { count: greenCount, error: greenError } = await supabase
      .from("boxes")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("current_status", "green");

    if (greenError) console.error("Green count error:", greenError);

    const { count: yellowCount, error: yellowError } = await supabase
      .from("boxes")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("current_status", "yellow");

    if (yellowError) console.error("Yellow count error:", yellowError);

    const { count: redCount, error: redError } = await supabase
      .from("boxes")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("current_status", "red");

    if (redError) console.error("Red count error:", redError);

    // 5. Letzter Scan-Zeitpunkt
    const { data: lastScanData, error: lastError } = await supabase
      .from("scans")
      .select("scanned_at")
      .eq("organisation_id", organisation_id)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) console.error("Last scan error:", lastError);

    // Berechnungen
    const totalBoxes = boxCount || 0;
    const greenBoxes = greenCount || 0;
    const yellowBoxes = yellowCount || 0;
    const redBoxes = redCount || 0;
    
    // Boxen ohne expliziten Status sind implizit "grün"
    const unassignedBoxes = totalBoxes - greenBoxes - yellowBoxes - redBoxes;
    const finalGreenBoxes = greenBoxes + Math.max(0, unassignedBoxes);
    
    const totalWarnings = yellowBoxes + redBoxes;

    console.log(`📊 Dashboard Stats: boxes=${totalBoxes}, today=${todayScansCount}, green=${finalGreenBoxes}, yellow=${yellowBoxes}, red=${redBoxes}`);

    return {
      boxes: totalBoxes,
      scansToday: todayScansCount || 0,
      scansThisWeek: weekScansCount || 0,
      warnings: totalWarnings,
      greenBoxes: finalGreenBoxes,
      yellowBoxes: yellowBoxes,
      redBoxes: redBoxes,
      lastSync: lastScanData?.scanned_at || null
    };
  } catch (err) {
    console.error("getStats exception:", err);
    return {
      boxes: 0,
      scansToday: 0,
      scansThisWeek: 0,
      warnings: 0,
      greenBoxes: 0,
      yellowBoxes: 0,
      redBoxes: 0,
      lastSync: null
    };
  }
};

// ============================================
// GET RECENT SCANS (Letzte Scans)
// ============================================
exports.getRecentScans = async (organisation_id) => {
  try {
    const { data, error } = await supabase
      .from("scans")
      .select(`
        id,
        status,
        notes,
        scanned_at,
        box_id,
        boxes (
          number,
          box_name
        ),
        users (
          first_name,
          last_name,
          email
        )
      `)
      .eq("organisation_id", organisation_id)
      .order("scanned_at", { ascending: false })
      .limit(15);

    if (error) {
      console.error("Recent scans error:", error);
      return [];
    }

    return (data || []).map(scan => ({
      id: scan.id,
      status: scan.status,
      box_name: scan.boxes?.box_name || `Box ${scan.boxes?.number || "?"}`,
      message: scan.notes || `Status: ${scan.status}`,
      created_at: scan.scanned_at,
      technician_name: scan.users?.first_name
        ? `${scan.users.first_name} ${scan.users.last_name}`
        : scan.users?.email || "Unbekannt"
    }));
  } catch (err) {
    console.error("getRecentScans exception:", err);
    return [];
  }
};