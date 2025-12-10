const { supabase } = require("../config/supabase");

// =============================================
//   GET ALL DASHBOARD DATA (Ein Request!)
// =============================================
exports.getAll = async (organisation_id) => {
  const today = new Date().toISOString().split("T")[0];

  // Alle Queries parallel ausführen
  const [boxesResult, todayScans, statusCounts, lastUpdate, recentScans, objects] = await Promise.all([
    // 1. Anzahl Boxen
    supabase
      .from("boxes")
      .select("id", { count: "exact" })
      .eq("organisation_id", organisation_id)
      .eq("active", true),

    // 2. Scans heute
    supabase
      .from("scans")
      .select("id", { count: "exact" })
      .eq("organisation_id", organisation_id)
      .gte("scanned_at", today),

    // 3. Status-Verteilung (alle Boxen)
    supabase
      .from("boxes")
      .select("current_status")
      .eq("organisation_id", organisation_id)
      .eq("active", true),

    // 4. Letzter Scan
    supabase
      .from("scans")
      .select("scanned_at")
      .eq("organisation_id", organisation_id)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 5. Letzte 10 Scans mit Details
    supabase
      .from("scans")
      .select(`
        id, status, notes, scanned_at, box_id,
        boxes (number, notes),
        users (first_name, last_name, email)
      `)
      .eq("organisation_id", organisation_id)
      .order("scanned_at", { ascending: false })
      .limit(10),

    // 6. Objekte
    supabase
      .from("objects")
      .select("id, name, address, active")
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .order("name", { ascending: true })
  ]);

  // Status zählen
  const statuses = statusCounts.data || [];
  const green = statuses.filter(b => b.current_status === "green").length;
  const yellow = statuses.filter(b => b.current_status === "yellow").length;
  const orange = statuses.filter(b => b.current_status === "orange").length;
  const red = statuses.filter(b => b.current_status === "red").length;

  // Scans formatieren
  const scans = (recentScans.data || []).map(scan => ({
    id: scan.id,
    box_name: scan.boxes?.notes || `Box ${scan.boxes?.number || "?"}`,
    message: scan.notes || `Status: ${scan.status}`,
    status: scan.status,
    created_at: scan.scanned_at,
    technician_name: scan.users?.first_name
      ? `${scan.users.first_name} ${scan.users.last_name}`
      : scan.users?.email || "Unbekannt"
  }));

  return {
    stats: {
      boxes: boxesResult.count || 0,
      scansToday: todayScans.count || 0,
      green,
      yellow,
      orange,
      red,
      warnings: yellow + orange + red,
      lastSync: lastUpdate.data?.scanned_at || null
    },
    recentScans: scans,
    objects: objects.data || []
  };
};

// =============================================
//   GET STATS (Legacy - für Kompatibilität)
// =============================================
exports.getStats = async (organisation_id) => {
  const today = new Date().toISOString().split("T")[0];

  const [boxesResult, todayScans, statusCounts, lastUpdate] = await Promise.all([
    supabase.from("boxes").select("id", { count: "exact" }).eq("organisation_id", organisation_id).eq("active", true),
    supabase.from("scans").select("id", { count: "exact" }).eq("organisation_id", organisation_id).gte("scanned_at", today),
    supabase.from("boxes").select("current_status").eq("organisation_id", organisation_id).eq("active", true),
    supabase.from("scans").select("scanned_at").eq("organisation_id", organisation_id).order("scanned_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const statuses = statusCounts.data || [];
  const green = statuses.filter(b => b.current_status === "green").length;
  const yellow = statuses.filter(b => b.current_status === "yellow").length;
  const red = statuses.filter(b => b.current_status === "red").length;

  console.log(`📊 Dashboard Stats: boxes=${boxesResult.count || 0}, today=${todayScans.count || 0}, green=${green}, yellow=${yellow}, red=${red}`);

  return {
    boxes: boxesResult.count || 0,
    scansToday: todayScans.count || 0,
    green,
    yellow,
    red,
    warnings: yellow + red,
    lastSync: lastUpdate.data?.scanned_at || null
  };
};

// =============================================
//   GET RECENT SCANS (Legacy)
// =============================================
exports.getRecentScans = async (organisation_id) => {
  const { data, error } = await supabase
    .from("scans")
    .select(`
      id, status, notes, scanned_at, box_id,
      boxes (number, notes),
      users (first_name, last_name, email)
    `)
    .eq("organisation_id", organisation_id)
    .order("scanned_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);

  return (data || []).map(scan => ({
    id: scan.id,
    box_name: scan.boxes?.notes || `Box ${scan.boxes?.number || "?"}`,
    message: scan.notes || `Status: ${scan.status}`,
    created_at: scan.scanned_at,
    technician_name: scan.users?.first_name
      ? `${scan.users.first_name} ${scan.users.last_name}`
      : scan.users?.email || "Unbekannt"
  }));
};