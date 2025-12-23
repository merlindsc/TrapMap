const { supabase } = require("../config/supabase");

// =============================================
//   GET ALL DASHBOARD DATA (Ein Request!)
// =============================================
exports.getAll = async (organisation_id) => {
  const today = new Date().toISOString().split("T")[0];

  // Alle Queries parallel ausführen
  const [boxesResult, todayScans, statusCounts, lastUpdate, recentScans, objects] = await Promise.all([
    // 1. Anzahl aktive Boxen (nur mit aktivem Object)
    supabase
      .from("boxes")
      .select("id, objects!inner(active)")
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("objects.active", true),

    // 2. Scans heute
    supabase
      .from("scans")
      .select("id", { count: "exact" })
      .eq("organisation_id", organisation_id)
      .gte("scanned_at", today),

    // 3. Status-Verteilung (nur aktive Boxen mit aktivem Object)
    supabase
      .from("boxes")
      .select("current_status, objects!inner(active)")
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("objects.active", true),

    // 4. Letzter Scan
    supabase
      .from("scans")
      .select("scanned_at")
      .eq("organisation_id", organisation_id)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 5. Letzte Scans mit Details - nur von aktiven Boxen mit aktivem Object
    supabase
      .from("scans")
      .select(`
        id, status, notes, scanned_at, box_id,
        boxes!inner (
          id, number, qr_code, notes, active,
          objects!inner (id, name, active)
        ),
        users (first_name, last_name, email)
      `)
      .eq("organisation_id", organisation_id)
      .eq("boxes.active", true)
      .eq("boxes.objects.active", true)
      .order("scanned_at", { ascending: false })
      .limit(50),

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

  // Scans formatieren und nach Objekt-Name sortieren
  const scans = (recentScans.data || [])
    .map(scan => ({
      id: scan.id,
      box_name: scan.boxes?.notes || `Box ${scan.boxes?.number || "?"}`,
      box_qr_code: scan.boxes?.qr_code || null,
      object_name: scan.boxes?.objects?.name || "Unbekannt",
      message: scan.notes || `Status: ${scan.status}`,
      status: scan.status,
      created_at: scan.scanned_at,
      technician_name: scan.users?.first_name
        ? `${scan.users.first_name} ${scan.users.last_name}`
        : scan.users?.email || "Unbekannt"
    }))
    // Sortieren nach Objekt A-Z, dann nach Datum (neueste zuerst)
    .sort((a, b) => {
      const objCompare = a.object_name.localeCompare(b.object_name, 'de');
      if (objCompare !== 0) return objCompare;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 20); // Limitieren auf 20

  return {
    stats: {
      boxes: boxesResult.data?.length || 0,
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
    supabase
      .from("boxes")
      .select("id, objects!inner(active)")
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("objects.active", true),
    supabase
      .from("scans")
      .select("id", { count: "exact" })
      .eq("organisation_id", organisation_id)
      .gte("scanned_at", today),
    supabase
      .from("boxes")
      .select("current_status, objects!inner(active)")
      .eq("organisation_id", organisation_id)
      .eq("active", true)
      .eq("objects.active", true),
    supabase
      .from("scans")
      .select("scanned_at")
      .eq("organisation_id", organisation_id)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const statuses = statusCounts.data || [];
  const green = statuses.filter(b => b.current_status === "green").length;
  const yellow = statuses.filter(b => b.current_status === "yellow").length;
  const orange = statuses.filter(b => b.current_status === "orange").length;
  const red = statuses.filter(b => b.current_status === "red").length;

  console.log(`📊 Dashboard Stats: boxes=${boxesResult.data?.length || 0}, today=${todayScans.count || 0}, green=${green}, yellow=${yellow}, orange=${orange}, red=${red}`);

  return {
    boxes: boxesResult.data?.length || 0,
    scansToday: todayScans.count || 0,
    green,
    yellow,
    orange,
    red,
    warnings: yellow + orange + red,
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
      boxes!inner (
        id, number, notes, active, qr_code,
        objects!inner (id, name, active)
      ),
      users (first_name, last_name, email)
    `)
    .eq("organisation_id", organisation_id)
    .eq("boxes.active", true)
    .eq("boxes.objects.active", true)
    .order("scanned_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data || [])
    .map(scan => ({
      id: scan.id,
      box_name: scan.boxes?.notes || `Box ${scan.boxes?.number || "?"}`,
      box_qr_code: scan.boxes?.qr_code || null,
      object_id: scan.boxes?.objects?.id || null,
      object_name: scan.boxes?.objects?.name || "Unbekannt",
      message: scan.notes || `Status: ${scan.status}`,
      status: scan.status,
      created_at: scan.scanned_at,
      technician_name: scan.users?.first_name
        ? `${scan.users.first_name} ${scan.users.last_name}`
        : scan.users?.email || "Unbekannt"
    }))
    .sort((a, b) => {
      const objCompare = a.object_name.localeCompare(b.object_name, 'de');
      if (objCompare !== 0) return objCompare;
      return new Date(b.created_at) - new Date(a.created_at);
    })
    .slice(0, 20);
};