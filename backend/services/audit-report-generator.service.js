/* ============================================================
   TRAPMAP – AUDIT REPORT PDF GENERATOR
   Simple & Working Version
   ============================================================ */

const PDFDocument = require("pdfkit");
const { supabase } = require("../config/supabase");

// Konstanten
const MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const USABLE_HEIGHT = PAGE_HEIGHT - 120;

// Farben
const BLUE = "#1e40af";
const GREEN = "#16a34a";
const YELLOW = "#eab308";
const ORANGE = "#d97706";
const RED = "#dc2626";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BLACK = "#1f2937";

// Status-Mapping
const STATUS_MAP = {
  green: { color: GREEN, label: "OK" },
  yellow: { color: YELLOW, label: "Auffällig" },
  orange: { color: ORANGE, label: "Erhöht" },
  red: { color: RED, label: "Befall" }
};

// Helper
const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("de-DE");
};

const formatDateTime = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

const cut = (str, len) => {
  if (!str) return "-";
  const s = String(str);
  return s.length > len ? s.slice(0, len - 1) + "…" : s;
};

// ============================================
// DATEN LADEN
// ============================================
async function loadData(objectId, orgId, options = {}) {
  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, logo_url, address, zip, city, phone, email")
    .eq("id", orgId)
    .single();

  const { data: obj } = await supabase
    .from("objects")
    .select("*")
    .eq("id", objectId)
    .eq("organisation_id", orgId)
    .single();

  if (!obj) throw new Error("Objekt nicht gefunden");

  const { data: boxes } = await supabase
    .from("boxes")
    .select("*, box_types:box_type_id(id, name, category, bait_type, bait_substance)")
    .eq("object_id", objectId)
    .eq("organisation_id", orgId)
    .eq("active", true)
    .order("number");

  const boxIds = (boxes || []).map(b => b.id);
  let scansQuery = supabase
    .from("scans")
    .select("*, users:user_id(id, first_name, last_name), boxes:box_id(number)")
    .eq("organisation_id", orgId)
    .order("scanned_at", { ascending: false });

  if (boxIds.length > 0) {
    scansQuery = scansQuery.in("box_id", boxIds);
  }

  const { data: scans } = await scansQuery.limit(options.maxScans || 100);

  const techMap = new Map();
  (scans || []).forEach(s => {
    if (s.users && s.user_id) {
      techMap.set(s.user_id, { id: s.user_id, ...s.users });
    }
  });

  return {
    org,
    obj,
    boxes: boxes || [],
    scans: scans || [],
    technicians: Array.from(techMap.values())
  };
}

// ============================================
// PDF GENERIEREN
// ============================================
async function generateAuditReport(objectId, orgId, options = {}) {
  const data = await loadData(objectId, orgId, options);
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: MARGIN,
      bufferPages: true
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = MARGIN;
    let pageNum = 1;

    // Helper
    const needsNewPage = (needed) => y + needed > USABLE_HEIGHT;
    
    const addPage = () => {
      doc.addPage();
      pageNum++;
      y = MARGIN;
      doc.fontSize(8).fillColor(GRAY);
      doc.text(`${data.org?.name || "TrapMap"} | ${data.obj.name} | Seite ${pageNum}`, MARGIN, 30);
      doc.moveTo(MARGIN, 45).lineTo(PAGE_WIDTH - MARGIN, 45).strokeColor(LIGHT_GRAY).stroke();
      y = 60;
    };

    const drawLine = () => {
      doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke();
      y += 5;
    };

    // ========== SEITE 1: TITEL ==========
    
    doc.fontSize(24).fillColor(BLUE).font("Helvetica-Bold");
    doc.text("AUDIT-REPORT", MARGIN, y);
    y += 35;
    
    doc.fontSize(12).fillColor(GRAY).font("Helvetica");
    doc.text("Schädlingsmonitoring", MARGIN, y);
    y += 30;

    // Objekt-Box
    doc.rect(MARGIN, y, CONTENT_WIDTH, 80).fillColor(LIGHT_GRAY).fill();
    doc.fontSize(16).fillColor(BLACK).font("Helvetica-Bold");
    doc.text(data.obj.name, MARGIN + 15, y + 10);
    doc.fontSize(10).fillColor(GRAY).font("Helvetica");
    if (data.obj.address) doc.text(data.obj.address, MARGIN + 15, y + 32);
    if (data.obj.city) doc.text(`${data.obj.zip_code || ""} ${data.obj.city}`.trim(), MARGIN + 15, y + 46);
    y += 95;

    // Dienstleister
    if (data.org) {
      doc.fontSize(10).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Durchgeführt von:", MARGIN, y);
      y += 14;
      doc.fontSize(11).fillColor(BLACK);
      doc.text(data.org.name, MARGIN, y);
      y += 30;
    }

    // Datum
    doc.fontSize(10).fillColor(BLACK).font("Helvetica");
    doc.text(`Erstellt am: ${formatDateTime(new Date())}`, MARGIN, y);
    y += 30;

    // ========== ZUSAMMENFASSUNG ==========
    
    doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
    doc.text("Zusammenfassung", MARGIN, y);
    y += 20;

    const totalBoxes = data.boxes.length;
    const totalScans = data.scans.length;
    const greenBoxes = data.boxes.filter(b => b.current_status === "green").length;
    const redBoxes = data.boxes.filter(b => b.current_status === "red").length;
    const redScans = data.scans.filter(s => s.status === "red").length;
    const rate = totalScans > 0 ? ((redScans / totalScans) * 100).toFixed(1) : 0;

    // KPI Boxen
    const boxW = 115, boxH = 50;
    const kpis = [
      { label: "Fallen", value: totalBoxes, color: BLUE },
      { label: "Kontrollen", value: totalScans, color: GRAY },
      { label: "OK", value: greenBoxes, color: GREEN },
      { label: "Befall", value: redBoxes, color: RED }
    ];

    kpis.forEach((kpi, i) => {
      const x = MARGIN + i * (boxW + 8);
      doc.roundedRect(x, y, boxW, boxH, 4).fillColor(kpi.color).fill();
      doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold");
      doc.text(String(kpi.value), x, y + 8, { width: boxW, align: "center" });
      doc.fontSize(9).font("Helvetica");
      doc.text(kpi.label, x, y + 32, { width: boxW, align: "center" });
    });
    y += boxH + 15;

    // Bewertung
    let bewertung = "Sehr gut", bewColor = GREEN;
    if (rate > 5) { bewertung = "Kritisch"; bewColor = RED; }
    else if (rate > 2) { bewertung = "Auffällig"; bewColor = ORANGE; }
    else if (redBoxes > 0) { bewertung = "Gut"; bewColor = YELLOW; }

    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 30, 4).fillColor(bewColor).fill();
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold");
    doc.text(`Bewertung: ${bewertung} | Befallsrate: ${rate}%`, MARGIN + 10, y + 9);
    y += 45;

    // ========== FALLENTYPEN ==========
    
    if (data.boxes.length > 0) {
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Fallentypen", MARGIN, y);
      y += 18;

      const types = {};
      data.boxes.forEach(b => {
        const name = b.box_types?.name || "Unbekannt";
        if (!types[name]) types[name] = { count: 0, cat: b.box_types?.category || "-", bait: b.box_types?.bait_type || "-" };
        types[name].count++;
      });

      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold");
      doc.text("Typ", MARGIN, y);
      doc.text("Kategorie", MARGIN + 150, y);
      doc.text("Köder", MARGIN + 280, y);
      doc.text("Anzahl", MARGIN + 420, y);
      y += 12;
      drawLine();

      doc.font("Helvetica").fillColor(BLACK);
      Object.entries(types).forEach(([name, info]) => {
        doc.text(cut(name, 25), MARGIN, y);
        doc.text(cut(info.cat, 20), MARGIN + 150, y);
        doc.text(cut(info.bait, 25), MARGIN + 280, y);
        doc.text(String(info.count), MARGIN + 420, y);
        y += 13;
      });
    }

    // ========== SEITE 2: FALLEN-DETAILS ==========
    
    if (data.boxes.length > 0) {
      addPage();
      
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Fallenübersicht", MARGIN, y);
      y += 18;

      doc.fontSize(7).fillColor(GRAY).font("Helvetica-Bold");
      doc.text("Nr.", MARGIN, y);
      doc.text("QR-Code", MARGIN + 30, y);
      doc.text("Typ", MARGIN + 100, y);
      doc.text("Status", MARGIN + 200, y);
      doc.text("Letzte Kontrolle", MARGIN + 270, y);
      doc.text("Nächste fällig", MARGIN + 370, y);
      y += 10;
      drawLine();

      doc.font("Helvetica").fontSize(7);
      
      data.boxes.forEach(box => {
        if (needsNewPage(11)) addPage();

        const status = STATUS_MAP[box.current_status] || STATUS_MAP.green;
        const interval = box.control_interval_days || 30;
        const lastScan = box.last_scan ? new Date(box.last_scan) : null;
        let nextDue = "-", overdue = false;
        
        if (lastScan) {
          const next = new Date(lastScan.getTime() + interval * 86400000);
          nextDue = formatDate(next);
          overdue = next < new Date();
        }

        doc.fillColor(BLACK);
        doc.text(String(box.number || "-"), MARGIN, y);
        doc.text(cut(box.qr_code, 12), MARGIN + 30, y);
        doc.text(cut(box.box_types?.name, 16), MARGIN + 100, y);
        doc.fillColor(status.color).text(status.label, MARGIN + 200, y);
        doc.fillColor(BLACK).text(formatDate(box.last_scan), MARGIN + 270, y);
        doc.fillColor(overdue ? RED : BLACK).text(nextDue, MARGIN + 370, y);
        
        y += 11;
      });
    }

    // ========== SEITE 3: SCANS ==========
    
    if (data.scans.length > 0) {
      addPage();
      
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Kontrollprotokoll", MARGIN, y);
      y += 18;

      doc.fontSize(7).fillColor(GRAY).font("Helvetica-Bold");
      doc.text("Datum", MARGIN, y);
      doc.text("Falle", MARGIN + 90, y);
      doc.text("Status", MARGIN + 130, y);
      doc.text("Techniker", MARGIN + 200, y);
      doc.text("Bemerkungen", MARGIN + 300, y);
      y += 10;
      drawLine();

      doc.font("Helvetica").fontSize(7);
      const maxScans = Math.min(data.scans.length, options.maxScans || 100);
      
      for (let i = 0; i < maxScans; i++) {
        if (needsNewPage(10)) addPage();
        
        const scan = data.scans[i];
        const status = STATUS_MAP[scan.status] || STATUS_MAP.green;
        const tech = scan.users ? `${scan.users.first_name || ""} ${scan.users.last_name || ""}`.trim() : "-";

        doc.fillColor(BLACK).text(formatDateTime(scan.scanned_at).slice(0, 16), MARGIN, y);
        doc.text(String(scan.boxes?.number || "-"), MARGIN + 90, y);
        doc.fillColor(status.color).text(status.label, MARGIN + 130, y);
        doc.fillColor(BLACK).text(cut(tech, 18), MARGIN + 200, y);
        doc.text(cut(scan.notes || scan.findings || "-", 35), MARGIN + 300, y);
        
        y += 10;
      }

      if (data.scans.length > maxScans) {
        y += 5;
        doc.fontSize(8).fillColor(GRAY);
        doc.text(`... und ${data.scans.length - maxScans} weitere`, MARGIN, y);
      }
    }

    // ========== TECHNIKER ==========
    
    if (data.technicians.length > 0 && !needsNewPage(80)) {
      y += 20;
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Techniker", MARGIN, y);
      y += 18;

      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold");
      doc.text("Name", MARGIN, y);
      doc.text("Kontrollen", MARGIN + 200, y);
      doc.text("OK", MARGIN + 280, y);
      doc.text("Auffällig", MARGIN + 330, y);
      doc.text("Befall", MARGIN + 400, y);
      y += 10;
      drawLine();

      doc.font("Helvetica");
      data.technicians.forEach(tech => {
        const techScans = data.scans.filter(s => s.user_id === tech.id);
        const name = `${tech.first_name || ""} ${tech.last_name || ""}`.trim();

        doc.fillColor(BLACK).text(cut(name, 30), MARGIN, y);
        doc.text(String(techScans.length), MARGIN + 200, y);
        doc.fillColor(GREEN).text(String(techScans.filter(s => s.status === "green").length), MARGIN + 280, y);
        doc.fillColor(ORANGE).text(String(techScans.filter(s => ["yellow", "orange"].includes(s.status)).length), MARGIN + 330, y);
        doc.fillColor(RED).text(String(techScans.filter(s => s.status === "red").length), MARGIN + 400, y);
        y += 12;
      });
    }

    // ========== LETZTE SEITE: RECHTLICHES ==========
    
    addPage();
    
    doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
    doc.text("Rechtliche Hinweise", MARGIN, y);
    y += 25;

    doc.fontSize(9).fillColor(BLACK).font("Helvetica");
    doc.text("Dieser Bericht wurde automatisch durch TrapMap erstellt.", MARGIN, y, { width: CONTENT_WIDTH });
    y += 20;
    doc.font("Helvetica-Bold").text("HACCP-Konformität:", MARGIN, y);
    y += 12;
    doc.font("Helvetica").text("Dieser Bericht unterstützt die Dokumentationsanforderungen nach HACCP.", MARGIN, y, { width: CONTENT_WIDTH });
    y += 20;
    doc.font("Helvetica-Bold").text("IFS Food / BRC:", MARGIN, y);
    y += 12;
    doc.font("Helvetica").text("Die dokumentierten Kontrollen entsprechen den IFS sowie BRC Standards.", MARGIN, y, { width: CONTENT_WIDTH });
    y += 40;

    // Unterschriften
    doc.fontSize(10).fillColor(BLACK).font("Helvetica-Bold");
    doc.text("Unterschriften:", MARGIN, y);
    y += 30;

    doc.moveTo(MARGIN, y).lineTo(MARGIN + 180, y).strokeColor(BLACK).lineWidth(0.5).stroke();
    doc.moveTo(MARGIN + 280, y).lineTo(MARGIN + 460, y).stroke();
    y += 5;
    doc.fontSize(8).fillColor(GRAY).font("Helvetica");
    doc.text("Erstellt durch", MARGIN, y);
    doc.text("Verantwortlicher Betrieb", MARGIN + 280, y);
    y += 12;
    doc.text("Datum: _______________", MARGIN, y);
    doc.text("Datum: _______________", MARGIN + 280, y);

    // ========== FOOTER ==========
    
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(GRAY).font("Helvetica");
      doc.text(
        `${formatDateTime(new Date())} | www.trap-map.de | Seite ${i + 1}/${pages.count}`,
        MARGIN, PAGE_HEIGHT - 30,
        { width: CONTENT_WIDTH, align: "center" }
      );
    }

    doc.end();
  });
}

async function loadReportData(objectId, orgId, options = {}) {
  return await loadData(objectId, orgId, options);
}

module.exports = { generateAuditReport, loadReportData };