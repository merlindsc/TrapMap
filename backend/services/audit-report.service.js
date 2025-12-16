// ============================================
// AUDIT REPORT SERVICE - KOMPLETT
// Professioneller Schädlingsbekämpfungs-Report
// Mit TrapMap Logo + Organisations-Logo
// HACCP/IFS konform
// ============================================

const PDFDocument = require("pdfkit");
const { supabase } = require("../config/supabase");
const path = require("path");
const fs = require("fs");

// ============================================
// FARBEN & STYLING
// ============================================
const COLORS = {
  primary: "#1e40af",      // TrapMap Blau
  secondary: "#059669",    // Grün für OK
  warning: "#d97706",      // Orange für Warnung
  danger: "#dc2626",       // Rot für Befall
  gray: "#6b7280",
  lightGray: "#f3f4f6",
  darkGray: "#374151",
  black: "#111827",
  white: "#ffffff",
  yellow: "#eab308"
};

const STATUS_CONFIG = {
  green: { color: COLORS.secondary, label: "OK", emoji: "✓" },
  yellow: { color: COLORS.yellow, label: "Leichte Auffälligkeiten", emoji: "⚠" },
  orange: { color: COLORS.warning, label: "Mittlere Auffälligkeiten", emoji: "⚠" },
  red: { color: COLORS.danger, label: "Befall", emoji: "✗" }
};

// ============================================
// HILFSFUNKTIONEN
// ============================================
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric" 
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { 
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return "-";
  return num.toLocaleString("de-DE");
};

// ============================================
// DATEN LADEN
// ============================================
async function loadReportData(objectId, organisationId, options = {}) {
  const { dateFrom, dateTo, includeScans = true, maxScans = 100 } = options;

  // Organisation laden (für Logo und Details)
  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", organisationId)
    .single();

  // Objekt laden
  const { data: object } = await supabase
    .from("objects")
    .select("*")
    .eq("id", objectId)
    .eq("organisation_id", organisationId)
    .single();

  if (!object) {
    throw new Error("Objekt nicht gefunden");
  }

  // Boxen laden mit allen Details
  const { data: boxes } = await supabase
    .from("boxes")
    .select(`
      *,
      box_types:box_type_id (
        id,
        name,
        category,
        description,
        bait_type,
        bait_substance,
        requires_symbol,
        border_color
      ),
      floor_plans:floor_plan_id (
        id,
        name,
        floor_number
      )
    `)
    .eq("object_id", objectId)
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .order("number", { ascending: true });

  // Scans laden (alle oder gefiltert nach Datum)
  let scansQuery = supabase
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
        qr_code
      )
    `)
    .eq("organisation_id", organisationId)
    .in("box_id", boxes?.map(b => b.id) || [])
    .order("scanned_at", { ascending: false });

  if (dateFrom) {
    scansQuery = scansQuery.gte("scanned_at", dateFrom);
  }
  if (dateTo) {
    scansQuery = scansQuery.lte("scanned_at", dateTo);
  }

  const { data: scans } = await scansQuery.limit(maxScans);

  // Box-Typen für Statistiken
  const { data: boxTypes } = await supabase
    .from("box_types")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("active", true);

  // Techniker die gescannt haben
  const technicianIds = [...new Set(scans?.map(s => s.user_id).filter(Boolean) || [])];
  const { data: technicians } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", technicianIds.length > 0 ? technicianIds : [-1]);

  return {
    organisation: org,
    object,
    boxes: boxes || [],
    scans: scans || [],
    boxTypes: boxTypes || [],
    technicians: technicians || [],
    generatedAt: new Date().toISOString(),
    dateFrom,
    dateTo
  };
}

// ============================================
// PDF GENERIERUNG
// ============================================
async function generateAuditReport(objectId, organisationId, options = {}) {
  const data = await loadReportData(objectId, organisationId, options);
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Audit-Report: ${data.object.name}`,
          Author: "TrapMap",
          Subject: "Schädlingsmonitoring Audit-Report",
          Creator: "TrapMap Software"
        }
      });

      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Seitenzähler
      let pageNumber = 1;
      const PAGE_WIDTH = 495; // A4 width minus margins
      const PAGE_HEIGHT = 692; // A4 height minus margins
      const BOTTOM_MARGIN = 80;

      // ========================================
      // HELPER: Neue Seite mit Header/Footer
      // ========================================
      const addNewPage = () => {
        doc.addPage();
        pageNumber++;
        addHeader();
        addFooter();
        return 120; // Start Y nach Header
      };

      // ========================================
      // HEADER (auf jeder Seite)
      // ========================================
      const addHeader = () => {
        const headerY = 30;
        
        // TrapMap Logo (links)
        try {
          const logoPath = path.join(__dirname, "../assets/trapmap-logo.png");
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, headerY, { height: 40 });
          } else {
            // Fallback: Text-Logo
            doc.fontSize(18).fillColor(COLORS.primary).font("Helvetica-Bold");
            doc.text("TrapMap", 50, headerY + 10);
          }
        } catch (e) {
          doc.fontSize(18).fillColor(COLORS.primary).font("Helvetica-Bold");
          doc.text("TrapMap", 50, headerY + 10);
        }

        // Organisations-Logo (rechts)
        if (data.organisation?.logo_url) {
          try {
            // Hier könnte man das Logo von URL laden
            // Für jetzt: Organisations-Name
            doc.fontSize(12).fillColor(COLORS.darkGray).font("Helvetica-Bold");
            doc.text(data.organisation.name || "", 350, headerY + 15, { 
              width: 195, 
              align: "right" 
            });
          } catch (e) {
            doc.fontSize(12).fillColor(COLORS.darkGray).font("Helvetica-Bold");
            doc.text(data.organisation?.name || "", 350, headerY + 15, { 
              width: 195, 
              align: "right" 
            });
          }
        } else {
          doc.fontSize(12).fillColor(COLORS.darkGray).font("Helvetica-Bold");
          doc.text(data.organisation?.name || "", 350, headerY + 15, { 
            width: 195, 
            align: "right" 
          });
        }

        // Trennlinie
        doc.moveTo(50, 75).lineTo(545, 75).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
      };

      // ========================================
      // FOOTER (auf jeder Seite)
      // ========================================
      const addFooter = () => {
        const footerY = 780;
        
        doc.fontSize(8).fillColor(COLORS.gray).font("Helvetica");
        
        // Links: Generiert am
        doc.text(
          `Erstellt am: ${formatDateTime(data.generatedAt)}`,
          50, footerY
        );
        
        // Mitte: TrapMap
        doc.text(
          "Erstellt mit TrapMap • www.trap-map.de",
          200, footerY,
          { width: 195, align: "center" }
        );
        
        // Rechts: Seitenzahl
        doc.text(
          `Seite ${pageNumber}`,
          400, footerY,
          { width: 145, align: "right" }
        );

        // Trennlinie
        doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10)
          .strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
      };

      // ========================================
      // TITELSEITE
      // ========================================
      addHeader();
      addFooter();

      let y = 120;

      // Titel
      doc.fontSize(24).fillColor(COLORS.primary).font("Helvetica-Bold");
      doc.text("AUDIT-REPORT", 50, y, { align: "center", width: PAGE_WIDTH });
      y += 35;

      doc.fontSize(14).fillColor(COLORS.darkGray).font("Helvetica");
      doc.text("Schädlingsmonitoring & Dokumentation", 50, y, { align: "center", width: PAGE_WIDTH });
      y += 50;

      // Objekt-Info Box
      doc.roundedRect(50, y, PAGE_WIDTH, 120, 5).fillColor(COLORS.lightGray).fill();
      doc.fillColor(COLORS.black);
      
      y += 15;
      doc.fontSize(16).font("Helvetica-Bold");
      doc.text(data.object.name, 70, y);
      y += 25;

      doc.fontSize(10).font("Helvetica").fillColor(COLORS.darkGray);
      if (data.object.address) {
        doc.text(`📍 ${data.object.address}`, 70, y);
        y += 15;
      }
      if (data.object.city) {
        doc.text(`   ${data.object.zip_code || ""} ${data.object.city}`, 70, y);
        y += 15;
      }
      if (data.object.contact_person) {
        doc.text(`👤 Ansprechpartner: ${data.object.contact_person}`, 70, y);
        y += 15;
      }
      if (data.object.phone) {
        doc.text(`📞 ${data.object.phone}`, 70, y);
      }

      y += 50;

      // Berichtszeitraum
      doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.black);
      doc.text("Berichtszeitraum:", 50, y);
      doc.font("Helvetica").fillColor(COLORS.darkGray);
      if (data.dateFrom || data.dateTo) {
        doc.text(
          `${formatDate(data.dateFrom) || "Beginn"} bis ${formatDate(data.dateTo) || "Heute"}`,
          160, y
        );
      } else {
        doc.text("Alle verfügbaren Daten", 160, y);
      }
      y += 30;

      // ========================================
      // ZUSAMMENFASSUNG / EXECUTIVE SUMMARY
      // ========================================
      doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary);
      doc.text("Zusammenfassung", 50, y);
      y += 25;

      // Statistiken berechnen
      const totalBoxes = data.boxes.length;
      const totalScans = data.scans.length;
      const greenScans = data.scans.filter(s => s.status === "green").length;
      const yellowScans = data.scans.filter(s => s.status === "yellow").length;
      const orangeScans = data.scans.filter(s => s.status === "orange").length;
      const redScans = data.scans.filter(s => s.status === "red").length;
      const infestationRate = totalScans > 0 ? ((redScans / totalScans) * 100).toFixed(1) : 0;

      // Status-Verteilung der Boxen
      const boxStatusCounts = {
        green: data.boxes.filter(b => b.current_status === "green").length,
        yellow: data.boxes.filter(b => b.current_status === "yellow").length,
        orange: data.boxes.filter(b => b.current_status === "orange").length,
        red: data.boxes.filter(b => b.current_status === "red").length
      };

      // Statistik-Boxen
      const statBoxWidth = 115;
      const statBoxHeight = 60;
      const stats = [
        { label: "Fallen gesamt", value: totalBoxes, color: COLORS.primary },
        { label: "Kontrollen", value: totalScans, color: COLORS.gray },
        { label: "OK Status", value: boxStatusCounts.green, color: COLORS.secondary },
        { label: "Befall", value: boxStatusCounts.red, color: COLORS.danger }
      ];

      stats.forEach((stat, i) => {
        const x = 50 + (i * (statBoxWidth + 10));
        doc.roundedRect(x, y, statBoxWidth, statBoxHeight, 5)
          .fillColor(stat.color).fill();
        
        doc.fillColor(COLORS.white).fontSize(24).font("Helvetica-Bold");
        doc.text(stat.value.toString(), x, y + 10, { width: statBoxWidth, align: "center" });
        
        doc.fontSize(9).font("Helvetica");
        doc.text(stat.label, x, y + 40, { width: statBoxWidth, align: "center" });
      });

      y += statBoxHeight + 30;

      // Gesamtbewertung
      let assessment = "Sehr gut - Keine Auffälligkeiten";
      let assessmentColor = COLORS.secondary;
      
      if (infestationRate > 5) {
        assessment = "Kritisch - Sofortmaßnahmen erforderlich";
        assessmentColor = COLORS.danger;
      } else if (infestationRate > 2) {
        assessment = "Auffällig - Verstärkte Überwachung empfohlen";
        assessmentColor = COLORS.warning;
      } else if (yellowScans + orangeScans > totalScans * 0.2) {
        assessment = "Gut - Leichte Auffälligkeiten beobachtet";
        assessmentColor = COLORS.yellow;
      }

      doc.roundedRect(50, y, PAGE_WIDTH, 40, 5).fillColor(assessmentColor).fill();
      doc.fillColor(COLORS.white).fontSize(12).font("Helvetica-Bold");
      doc.text("Gesamtbewertung: " + assessment, 60, y + 12, { width: PAGE_WIDTH - 20 });
      doc.fontSize(10).font("Helvetica");
      doc.text(`Befallsrate: ${infestationRate}%`, 60, y + 27);

      y += 60;

      // ========================================
      // FALLEN-TYPEN ÜBERSICHT
      // ========================================
      if (y > PAGE_HEIGHT - 150) y = addNewPage();

      doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary);
      doc.text("Eingesetzte Fallentypen", 50, y);
      y += 25;

      // Gruppiere Boxen nach Typ
      const boxesByType = {};
      data.boxes.forEach(box => {
        const typeName = box.box_types?.name || "Unbekannt";
        if (!boxesByType[typeName]) {
          boxesByType[typeName] = {
            count: 0,
            category: box.box_types?.category || "-",
            baitType: box.box_types?.bait_type || "-",
            baitSubstance: box.box_types?.bait_substance || "-",
            description: box.box_types?.description || ""
          };
        }
        boxesByType[typeName].count++;
      });

      // Tabellen-Header
      doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.darkGray);
      doc.text("Fallentyp", 50, y);
      doc.text("Kategorie", 180, y);
      doc.text("Köder", 280, y);
      doc.text("Wirkstoff", 380, y);
      doc.text("Anzahl", 480, y);
      y += 5;
      doc.moveTo(50, y + 10).lineTo(545, y + 10).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
      y += 20;

      doc.font("Helvetica").fontSize(9).fillColor(COLORS.black);
      Object.entries(boxesByType).forEach(([typeName, info]) => {
        if (y > PAGE_HEIGHT - BOTTOM_MARGIN) y = addNewPage();
        
        doc.text(typeName.substring(0, 25), 50, y);
        doc.text(info.category, 180, y);
        doc.text((info.baitType || "-").substring(0, 20), 280, y);
        doc.text((info.baitSubstance || "-").substring(0, 20), 380, y);
        doc.text(info.count.toString(), 480, y);
        y += 15;
      });

      y += 20;

      // ========================================
      // NEUE SEITE: FALLEN-DETAILS
      // ========================================
      y = addNewPage();

      doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary);
      doc.text("Fallenübersicht - Detailliert", 50, y);
      y += 25;

      // Tabellen-Header
      doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.darkGray);
      doc.text("Nr.", 50, y);
      doc.text("QR-Code", 75, y);
      doc.text("Typ", 145, y);
      doc.text("Standort", 230, y);
      doc.text("Status", 330, y);
      doc.text("Letzte Kontrolle", 390, y);
      doc.text("Nächste fällig", 480, y);
      y += 5;
      doc.moveTo(50, y + 8).lineTo(545, y + 8).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
      y += 15;

      doc.font("Helvetica").fontSize(8);
      
      for (const box of data.boxes) {
        if (y > PAGE_HEIGHT - BOTTOM_MARGIN) y = addNewPage();

        const statusConfig = STATUS_CONFIG[box.current_status] || STATUS_CONFIG.green;
        
        // Standort bestimmen
        let location = "-";
        if (box.floor_plans?.name) {
          location = `${box.floor_plans.name}${box.grid_position ? ` (${box.grid_position})` : ""}`;
        } else if (box.lat && box.lng) {
          location = `GPS: ${box.lat.toFixed(4)}, ${box.lng.toFixed(4)}`;
        }

        // Nächste Kontrolle berechnen
        const interval = box.control_interval_days || 30;
        const lastScan = box.last_scan ? new Date(box.last_scan) : null;
        let nextDue = "-";
        let overdue = false;
        
        if (lastScan) {
          const nextDate = new Date(lastScan.getTime() + interval * 86400000);
          nextDue = formatDate(nextDate);
          overdue = nextDate < new Date();
        }

        // Zeile zeichnen
        doc.fillColor(COLORS.black);
        doc.text((box.number || "-").toString(), 50, y);
        doc.text((box.qr_code || "-").substring(0, 12), 75, y);
        doc.text((box.box_types?.name || "-").substring(0, 15), 145, y);
        doc.text(location.substring(0, 18), 230, y);
        
        // Status farbig
        doc.fillColor(statusConfig.color);
        doc.text(statusConfig.label.substring(0, 12), 330, y);
        
        doc.fillColor(COLORS.black);
        doc.text(formatDate(box.last_scan), 390, y);
        
        // Überfällig rot markieren
        doc.fillColor(overdue ? COLORS.danger : COLORS.black);
        doc.text(nextDue, 480, y);
        
        y += 14;
      }

      y += 20;

      // ========================================
      // NEUE SEITE: KONTROLLPROTOKOLL
      // ========================================
      if (data.scans.length > 0) {
        y = addNewPage();

        doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary);
        doc.text("Kontrollprotokoll", 50, y);
        y += 25;

        // Tabellen-Header
        doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.darkGray);
        doc.text("Datum/Zeit", 50, y);
        doc.text("Falle", 130, y);
        doc.text("Typ", 170, y);
        doc.text("Status", 250, y);
        doc.text("Techniker", 320, y);
        doc.text("Befunde/Bemerkungen", 410, y);
        y += 5;
        doc.moveTo(50, y + 8).lineTo(545, y + 8).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
        y += 15;

        doc.font("Helvetica").fontSize(8);

        for (const scan of data.scans.slice(0, 100)) { // Max 100 Scans
          if (y > PAGE_HEIGHT - BOTTOM_MARGIN) y = addNewPage();

          const box = data.boxes.find(b => b.id === scan.box_id);
          const statusConfig = STATUS_CONFIG[scan.status] || STATUS_CONFIG.green;
          const techName = scan.users 
            ? `${scan.users.first_name || ""} ${scan.users.last_name || ""}`.trim() || scan.users.email
            : "-";

          // Bemerkungen zusammenfassen
          let remarks = [];
          if (scan.findings) remarks.push(scan.findings);
          if (scan.notes) remarks.push(scan.notes);
          if (scan.consumption) remarks.push(`Verbr.: ${scan.consumption}g`);
          if (scan.quantity) remarks.push(`Anz.: ${scan.quantity}`);
          const remarkText = remarks.join(", ").substring(0, 30) || "-";

          doc.fillColor(COLORS.black);
          doc.text(formatDateTime(scan.scanned_at).substring(0, 16), 50, y);
          doc.text((box?.number || scan.boxes?.number || "-").toString(), 130, y);
          doc.text((box?.box_types?.name || "-").substring(0, 12), 170, y);
          
          doc.fillColor(statusConfig.color);
          doc.text(statusConfig.label.substring(0, 12), 250, y);
          
          doc.fillColor(COLORS.black);
          doc.text(techName.substring(0, 15), 320, y);
          doc.text(remarkText, 410, y);
          
          y += 14;
        }

        if (data.scans.length > 100) {
          y += 10;
          doc.fontSize(9).fillColor(COLORS.gray).font("Helvetica-Oblique");
          doc.text(`... und ${data.scans.length - 100} weitere Kontrollen`, 50, y);
        }
      }

      // ========================================
      // NEUE SEITE: TECHNIKER-ÜBERSICHT
      // ========================================
      if (data.technicians.length > 0) {
        y = addNewPage();

        doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary);
        doc.text("Techniker-Übersicht", 50, y);
        y += 25;

        // Tabellen-Header
        doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.darkGray);
        doc.text("Techniker", 50, y);
        doc.text("Kontrollen", 200, y);
        doc.text("Letzte Kontrolle", 280, y);
        doc.text("OK", 400, y);
        doc.text("Auffällig", 440, y);
        doc.text("Befall", 500, y);
        y += 5;
        doc.moveTo(50, y + 10).lineTo(545, y + 10).strokeColor(COLORS.gray).lineWidth(0.5).stroke();
        y += 20;

        doc.font("Helvetica").fontSize(9);

        for (const tech of data.technicians) {
          if (y > PAGE_HEIGHT - BOTTOM_MARGIN) y = addNewPage();

          const techScans = data.scans.filter(s => s.user_id === tech.id);
          const techName = `${tech.first_name || ""} ${tech.last_name || ""}`.trim() || tech.email;
          const lastScan = techScans[0]?.scanned_at;
          const greenCount = techScans.filter(s => s.status === "green").length;
          const yellowOrangeCount = techScans.filter(s => s.status === "yellow" || s.status === "orange").length;
          const redCount = techScans.filter(s => s.status === "red").length;

          doc.fillColor(COLORS.black);
          doc.text(techName, 50, y);
          doc.text(techScans.length.toString(), 200, y);
          doc.text(formatDate(lastScan), 280, y);
          doc.fillColor(COLORS.secondary).text(greenCount.toString(), 400, y);
          doc.fillColor(COLORS.warning).text(yellowOrangeCount.toString(), 440, y);
          doc.fillColor(COLORS.danger).text(redCount.toString(), 500, y);
          
          y += 18;
        }
      }

      // ========================================
      // LETZTE SEITE: RECHTLICHE HINWEISE
      // ========================================
      y = addNewPage();

      doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.primary);
      doc.text("Rechtliche Hinweise & Zertifizierung", 50, y);
      y += 30;

      doc.fontSize(10).font("Helvetica").fillColor(COLORS.darkGray);
      
      const legalText = `
Dieser Bericht wurde automatisch durch das TrapMap Schädlingsmonitoring-System erstellt und dient als Nachweis für die ordnungsgemäße Durchführung von Schädlingskontrollen gemäß den geltenden Hygienevorschriften.

HACCP-Konformität:
Dieser Bericht unterstützt die Dokumentationsanforderungen nach HACCP (Hazard Analysis and Critical Control Points) und kann als Nachweis bei Audits und behördlichen Kontrollen verwendet werden.

IFS Food / BRC:
Die dokumentierten Kontrollen entsprechen den Anforderungen der International Featured Standards (IFS) sowie des British Retail Consortium (BRC) Standards für Schädlingsbekämpfung.

Datenintegrität:
Alle Daten werden manipulationssicher in der TrapMap-Datenbank gespeichert. Jede Änderung wird protokolliert und ist nachvollziehbar.
      `.trim();

      doc.text(legalText, 50, y, { width: PAGE_WIDTH, lineGap: 5 });
      y += 200;

      // Unterschriftenfelder
      doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.black);
      doc.text("Unterschriften:", 50, y);
      y += 30;

      // Ersteller
      doc.moveTo(50, y + 30).lineTo(200, y + 30).strokeColor(COLORS.black).lineWidth(0.5).stroke();
      doc.fontSize(9).font("Helvetica").fillColor(COLORS.gray);
      doc.text("Erstellt durch", 50, y + 35);
      doc.text("Datum", 50, y + 48);

      // Verantwortlicher
      doc.moveTo(280, y + 30).lineTo(430, y + 30).strokeColor(COLORS.black).lineWidth(0.5).stroke();
      doc.text("Verantwortlicher Betrieb", 280, y + 35);
      doc.text("Datum", 280, y + 48);

      // Finalize
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// EXPORT
// ============================================
module.exports = {
  generateAuditReport,
  loadReportData
};