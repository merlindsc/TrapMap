// ============================================
// AUDIT CONTROLLER
// Alle Audit-API-Operationen
// ============================================

const auditService = require("../services/audit.service");
const { supabase } = require("../config/supabase");

// ============================================
// GET AUDIT LOGS
// ============================================
exports.getLogs = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const {
      category,
      entity_type,
      entity_id,
      action,
      severity,
      user_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    const filters = {
      category,
      entityType: entity_type,
      entityId: entity_id ? parseInt(entity_id) : null,
      action,
      severity,
      userId: user_id ? parseInt(user_id) : null,
      startDate: start_date,
      endDate: end_date,
      limit: Math.min(parseInt(limit) || 100, 500),
      offset: parseInt(offset) || 0
    };

    const result = await auditService.getAuditLogs(orgId, filters);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.data,
      count: result.data.length,
      filters
    });
  } catch (err) {
    console.error("Get audit logs error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET AUDIT STATS
// ============================================
exports.getStats = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const days = parseInt(req.query.days) || 30;

    const result = await auditService.getAuditStats(orgId, days);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (err) {
    console.error("Get audit stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET BOX HISTORY
// ============================================
exports.getBoxHistory = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const boxId = parseInt(req.params.boxId);
    const limit = parseInt(req.query.limit) || 100;

    const result = await auditService.getBoxFullHistory(boxId, orgId, limit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Kombiniere und sortiere alle Einträge
    const allEntries = [
      ...result.data.audit.map(e => ({ ...e, source: "audit" })),
      ...result.data.locations.map(e => ({ ...e, source: "location" })),
      ...result.data.assignments.map(e => ({ ...e, source: "assignment" }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      box_id: boxId,
      total: allEntries.length,
      data: allEntries,
      breakdown: {
        audit: result.data.audit.length,
        locations: result.data.locations.length,
        assignments: result.data.assignments.length
      }
    });
  } catch (err) {
    console.error("Get box history error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET BOX LOCATION HISTORY
// ============================================
exports.getBoxLocationHistory = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const boxId = parseInt(req.params.boxId);
    const limit = parseInt(req.query.limit) || 50;

    const result = await auditService.getBoxLocationHistory(boxId, orgId, limit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      box_id: boxId,
      data: result.data
    });
  } catch (err) {
    console.error("Get box location history error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET BOX ASSIGNMENT HISTORY
// ============================================
exports.getBoxAssignmentHistory = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const boxId = parseInt(req.params.boxId);

    const { data, error } = await supabase
      .from("box_assignment_history")
      .select(`
        *,
        users:user_id (first_name, last_name)
      `)
      .eq("box_id", boxId)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      box_id: boxId,
      data: data || []
    });
  } catch (err) {
    console.error("Get box assignment history error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET USER ACTIVITY
// ============================================
exports.getUserActivity = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const limit = parseInt(req.query.limit) || 100;

    const result = await auditService.getUserActivity(orgId, null, limit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (err) {
    console.error("Get user activity error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET USER ACTIVITY BY ID
// ============================================
exports.getUserActivityById = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 100;

    const result = await auditService.getUserActivity(orgId, userId, limit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      user_id: userId,
      data: result.data
    });
  } catch (err) {
    console.error("Get user activity by id error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// EXPORT CSV
// ============================================
exports.exportCSV = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = req.user.id;
    const { start_date, end_date, category, entity_type } = req.body;

    // Daten abrufen
    const filters = {
      startDate: start_date,
      endDate: end_date,
      category,
      entityType: entity_type,
      limit: 10000
    };

    const result = await auditService.getAuditLogs(orgId, filters);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // CSV erstellen
    const headers = [
      "Datum",
      "Aktion",
      "Kategorie",
      "Schwere",
      "Entität",
      "Entitäts-ID",
      "Benutzer",
      "Details",
      "Alte Werte",
      "Neue Werte"
    ];

    const rows = result.data.map(row => [
      new Date(row.created_at).toLocaleString("de-DE"),
      row.action,
      row.category,
      row.severity,
      row.entity_type,
      row.entity_id || "",
      row.users ? `${row.users.first_name} ${row.users.last_name}` : "",
      row.details || "",
      row.old_values ? JSON.stringify(row.old_values) : "",
      row.new_values ? JSON.stringify(row.new_values) : ""
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    // Export loggen
    await auditService.logReportGenerated("audit_export_csv", orgId, userId, filters, result.data.length);

    // CSV Response
    const filename = `Audit_Export_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent); // BOM für Excel
  } catch (err) {
    console.error("Export CSV error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// EXPORT JSON
// ============================================
exports.exportJSON = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = req.user.id;
    const { start_date, end_date, category, entity_type, include_full_history } = req.body;

    const filters = {
      startDate: start_date,
      endDate: end_date,
      category,
      entityType: entity_type,
      limit: 10000
    };

    const result = await auditService.getAuditLogs(orgId, filters);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Export loggen
    await auditService.logReportGenerated("audit_export_json", orgId, userId, filters, result.data.length);

    const exportData = {
      exported_at: new Date().toISOString(),
      organisation_id: orgId,
      filters,
      record_count: result.data.length,
      data: result.data
    };

    const filename = `Audit_Export_${new Date().toISOString().split("T")[0]}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (err) {
    console.error("Export JSON error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET EXPORT HISTORY
// ============================================
exports.getExportHistory = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;

    const { data, error } = await supabase
      .from("audit_export_log")
      .select(`
        *,
        users:user_id (first_name, last_name)
      `)
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error("Get export history error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET SETTINGS
// ============================================
exports.getSettings = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;

    const { data, error } = await supabase
      .from("organisation_settings")
      .select("*")
      .eq("organisation_id", orgId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // Feste Retention-Werte
    const settings = data || {
      organisation_id: orgId,
      audit_retention_years: 5,  // Fest: 5 Jahre
      audit_enabled: true,
      log_scans: true,
      log_box_changes: true,
      log_user_activity: true,
      log_report_generation: true,
      retention_price_cents: 0   // Kostenlos
    };

    // Info über Foto-Retention hinzufügen
    settings.photo_retention_years = 2;  // Fest: 2 Jahre

    res.json({
      success: true,
      data: settings,
      info: {
        audit_retention: "5 Jahre (fest)",
        photo_retention: "2 Jahre (automatisch gelöscht)",
        cost: "Kostenlos"
      }
    });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// UPDATE SETTINGS (nur Logging-Optionen)
// ============================================
exports.updateSettings = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const {
      audit_enabled,
      log_scans,
      log_box_changes,
      log_user_activity,
      log_report_generation,
      notify_critical_events,
      notify_email
    } = req.body;

    // Upsert Settings (Retention ist immer 5 Jahre, kostenlos)
    const { data, error } = await supabase
      .from("organisation_settings")
      .upsert({
        organisation_id: orgId,
        audit_retention_years: 5,  // Fest
        audit_enabled: audit_enabled !== false,
        log_scans: log_scans !== false,
        log_box_changes: log_box_changes !== false,
        log_user_activity: log_user_activity !== false,
        log_report_generation: log_report_generation !== false,
        notify_critical_events: notify_critical_events !== false,
        notify_email: notify_email || null,
        retention_price_cents: 0,  // Kostenlos
        updated_at: new Date().toISOString()
      }, {
        onConflict: "organisation_id"
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: "Einstellungen gespeichert"
    });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// GET RETENTION OPTIONS (Info only)
// ============================================
exports.getRetentionOptions = async (req, res) => {
  // Feste Werte - keine Auswahl mehr
  res.json({
    success: true,
    info: "Retention ist fest eingestellt",
    data: {
      audit_logs: {
        retention_years: 5,
        description: "Alle Audit-Logs werden 5 Jahre aufbewahrt"
      },
      photos: {
        retention_years: 2,
        description: "Fotos werden nach 2 Jahren automatisch gelöscht"
      },
      cost: "Kostenlos inklusive"
    }
  });
};

// ============================================
// GENERATE COMPLIANCE REPORT
// ============================================
exports.generateComplianceReport = async (req, res) => {
  try {
    const orgId = req.user.organisation_id;
    const userId = req.user.id;
    const { object_id, start_date, end_date, include_photos = false } = req.body;

    if (!object_id || !start_date || !end_date) {
      return res.status(400).json({ error: "object_id, start_date und end_date erforderlich" });
    }

    // Alle relevanten Daten sammeln
    const [scansRes, boxHistoryRes, auditRes] = await Promise.all([
      // Alle Scans im Zeitraum
      supabase
        .from("scans")
        .select(`
          *,
          boxes:box_id (number, notes),
          users:user_id (first_name, last_name)
        `)
        .eq("organisation_id", orgId)
        .gte("scanned_at", start_date)
        .lte("scanned_at", end_date + "T23:59:59")
        .order("scanned_at", { ascending: true }),

      // Box-Historie
      supabase
        .from("audit_log")
        .select("*")
        .eq("organisation_id", orgId)
        .eq("category", "box")
        .gte("created_at", start_date)
        .lte("created_at", end_date + "T23:59:59"),

      // Alle Audit-Logs
      supabase
        .from("audit_log")
        .select("*")
        .eq("organisation_id", orgId)
        .gte("created_at", start_date)
        .lte("created_at", end_date + "T23:59:59")
    ]);

    // Filter nach Object
    const objectScans = (scansRes.data || []).filter(s => 
      s.object_id === parseInt(object_id)
    );

    // Statistiken berechnen
    const stats = {
      totalScans: objectScans.length,
      greenScans: objectScans.filter(s => s.status === "green").length,
      yellowScans: objectScans.filter(s => s.status === "yellow").length,
      redScans: objectScans.filter(s => s.status === "red").length,
      pestFindings: objectScans.filter(s => s.pest_found).length,
      uniqueTechnicians: [...new Set(objectScans.map(s => s.user_id))].length,
      boxChanges: (boxHistoryRes.data || []).length,
      totalAuditEvents: (auditRes.data || []).length
    };

    // Report loggen
    await auditService.logReportGenerated(
      "compliance_report",
      orgId,
      userId,
      { object_id, start_date, end_date },
      objectScans.length
    );

    res.json({
      success: true,
      report: {
        generated_at: new Date().toISOString(),
        period: { start_date, end_date },
        object_id,
        statistics: stats,
        scans: objectScans,
        box_changes: boxHistoryRes.data || [],
        audit_trail: auditRes.data || []
      }
    });
  } catch (err) {
    console.error("Generate compliance report error:", err);
    res.status(500).json({ error: "Server error" });
  }
};