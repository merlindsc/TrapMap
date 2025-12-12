// ============================================
// AUDIT CLEANUP JOB
// Feste Retention: Audit 5 Jahre, Fotos 2 Jahre
// 
// Ausführung: 
//   - Via Cron: node jobs/audit-cleanup.js
//   - Via Supabase: SELECT cleanup_expired_audit_logs();
// ============================================

const { supabase } = require("../config/supabase");

/**
 * Führt das Cleanup durch
 * - Audit-Logs älter als 5 Jahre löschen
 * - Fotos älter als 2 Jahre entfernen
 */
const runCleanup = async () => {
  console.log("🧹 Starting audit cleanup job...");
  console.log("   📋 Audit-Logs: 5 Jahre Retention");
  console.log("   📸 Fotos: 2 Jahre Retention");
  const startTime = Date.now();

  try {
    // Via Supabase Function aufrufen
    const { data, error } = await supabase.rpc("cleanup_expired_audit_logs");

    if (error) {
      console.error("⚠️ DB function error:", error.message);
      // Fallback: Manuelles Cleanup
      return await runManualCleanup();
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Cleanup abgeschlossen in ${duration}ms`);
    console.log(`   📋 Audit-Einträge gelöscht: ${data?.audit_entries_deleted || 0}`);
    console.log(`   📸 Fotos entfernt: ${data?.photos_cleaned || 0}`);

    return {
      success: true,
      ...data,
      duration_ms: duration,
      method: "db_function"
    };

  } catch (err) {
    console.error("❌ Cleanup job failed:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Manuelles Cleanup (Fallback)
 */
const runManualCleanup = async () => {
  console.log("⚠️ Running manual cleanup...");
  
  const now = new Date().toISOString();
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
  let auditDeleted = 0;
  let photosDeleted = 0;

  // Audit-Tabellen (expires_at basiert)
  const tables = [
    "audit_log",
    "box_location_history",
    "box_assignment_history",
    "scan_audit",
    "user_activity_log",
    "audit_export_log"
  ];

  for (const table of tables) {
    try {
      const { data } = await supabase
        .from(table)
        .delete()
        .lt("expires_at", now)
        .select("id");

      auditDeleted += data?.length || 0;
    } catch (err) {
      console.error(`⚠️ Error cleaning ${table}:`, err.message);
    }
  }

  // Fotos älter als 2 Jahre entfernen
  try {
    const { data } = await supabase
      .from("scans")
      .update({ photo_url: null })
      .lt("scanned_at", twoYearsAgo)
      .not("photo_url", "is", null)
      .select("id");

    photosDeleted = data?.length || 0;
  } catch (err) {
    console.error("⚠️ Error cleaning photos:", err.message);
  }

  console.log(`✅ Manual cleanup done: ${auditDeleted} audit entries, ${photosDeleted} photos`);

  return {
    success: true,
    audit_entries_deleted: auditDeleted,
    photos_cleaned: photosDeleted,
    method: "manual"
  };
};

/**
 * Statistiken abrufen
 */
const getStorageStats = async (orgId = null) => {
  try {
    const tables = [
      "audit_log",
      "box_location_history", 
      "box_assignment_history",
      "scan_audit",
      "user_activity_log"
    ];

    const stats = {};
    let totalCount = 0;

    for (const table of tables) {
      let query = supabase
        .from(table)
        .select("id", { count: "exact", head: true });

      if (orgId) {
        query = query.eq("organisation_id", orgId);
      }

      const { count } = await query;
      stats[table] = count || 0;
      totalCount += count || 0;
    }

    // Foto-Statistik
    let photoQuery = supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .not("photo_url", "is", null);

    if (orgId) {
      photoQuery = photoQuery.eq("organisation_id", orgId);
    }

    const { count: photoCount } = await photoQuery;
    stats.photos = photoCount || 0;

    return {
      success: true,
      organisation_id: orgId,
      tables: stats,
      total_audit_records: totalCount,
      total_photos: photoCount || 0,
      retention: {
        audit: "5 Jahre",
        photos: "2 Jahre"
      }
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

// CLI Execution
if (require.main === module) {
  runCleanup()
    .then(result => {
      console.log("Result:", JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error("Error:", err);
      process.exit(1);
    });
}

module.exports = {
  runCleanup,
  getStorageStats
};