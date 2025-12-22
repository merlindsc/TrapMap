/* ============================================================
   TRAPMAP – AUDIT REPORT PDF GENERATOR
   Simple & Working Version
   ============================================================ */

const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const { supabase } = require("../config/supabase");

// Konstanten
const MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const USABLE_HEIGHT = PAGE_HEIGHT - 80;

// Farben
const BLUE = "#1e40af";
const GREEN = "#16a34a";
const YELLOW = "#eab308";
const ORANGE = "#d97706";
const RED = "#dc2626";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";
const BLACK = "#1f2937";

// TRAPMAP LOGO URL - Use local public logo
const TRAPMAP_LOGO_URL = "http://localhost:5173/logo.png";

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

// Image loading helper function
const loadImage = async (url) => {
  if (!url) return null;
  try {
    const proto = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);
      
      proto.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          loadImage(res.headers.location).then(resolve);
          clearTimeout(timeout);
          return;
        }
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        });
        res.on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      }).on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  } catch (e) {
    console.log(`Image loading failed for ${url}:`, e.message);
    return null;
  }
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

  // Für archivierte Objekte: Hole ALLE Scans die jemals zu diesem Objekt gehörten
  // und leite daraus die Boxen ab (da Boxen bei Archivierung object_id = null gesetzt bekommen)
  let boxes = [];
  let boxIds = [];
  
  if (obj.archived_at) {
    // Archiviertes Objekt: Hole alle Scans für dieses Objekt
    const { data: allScans } = await supabase
      .from("scans")
      .select("box_id")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId);
    
    if (allScans && allScans.length > 0) {
      // Eindeutige Box-IDs aus Scans
      boxIds = [...new Set(allScans.map(s => s.box_id))];
      
      // Hole diese Boxen (auch wenn sie jetzt object_id = null haben)
      const { data: foundBoxes } = await supabase
        .from("boxes")
        .select("*, box_types:box_type_id(id, name, category, bait_type, bait_substance)")
        .in("id", boxIds)
        .eq("organisation_id", orgId)
        .order("number");
      
      boxes = foundBoxes || [];
    }
  } else {
    // Aktives Objekt: Normale Query
    const { data: foundBoxes } = await supabase
      .from("boxes")
      .select("*, box_types:box_type_id(id, name, category, bait_type, bait_substance)")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .eq("active", true)
      .order("number");
    
    boxes = foundBoxes || [];
    boxIds = boxes.map(b => b.id);
  }
  
  // Scans laden
  let scansQuery = supabase
    .from("scans")
    .select("*, users:user_id(id, first_name, last_name), boxes:box_id(number)")
    .eq("organisation_id", orgId)
    .order("scanned_at", { ascending: false });

  // Für archivierte Objekte: Lade Scans direkt über object_id
  // Für aktive Objekte: Lade Scans über box_id Liste
  if (obj.archived_at) {
    scansQuery = scansQuery.eq("object_id", objectId);
  } else if (boxIds.length > 0) {
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
  
  // TrapMap Logo laden - try local file first, then URL
  let trapMapLogoBuffer = null;
  try {
    // Try to load from local public folder
    const logoPath = path.join(__dirname, "../../frontend/public/logo.png");
    if (fs.existsSync(logoPath)) {
      console.log("📷 Loading TrapMap logo from local file:", logoPath);
      trapMapLogoBuffer = fs.readFileSync(logoPath);
      console.log("📷 TrapMap logo loaded from local file, size:", trapMapLogoBuffer.length, "bytes");
    } else {
      // Fallback to URL
      console.log("📷 Local logo not found, loading from URL:", TRAPMAP_LOGO_URL);
      trapMapLogoBuffer = await loadImage(TRAPMAP_LOGO_URL);
      if (trapMapLogoBuffer) {
        console.log("📷 TrapMap logo loaded from URL, size:", trapMapLogoBuffer.length, "bytes");
      }
    }
  } catch (e) {
    console.log("📷 TrapMap logo loading failed:", e.message);
  }
  
  if (!trapMapLogoBuffer) {
    console.log("📷 TrapMap logo not available from any source");
  }

  // Organisations-Logo laden falls verfügbar
  console.log("📷 Loading organization logo from:", data.org?.logo_url);
  const orgLogoBuffer = data.org?.logo_url ? await loadImage(data.org.logo_url) : null;
  if (orgLogoBuffer) {
    console.log("📷 Organization logo loaded successfully, size:", orgLogoBuffer.length, "bytes");
  } else if (data.org?.logo_url) {
    console.log("📷 Organization logo loading failed");
  }
  
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

    let y = 85; // Start nach Header
    let pageNum = 1;

    // Helper
    const needsNewPage = (needed) => y + needed > USABLE_HEIGHT;
    
    const addPage = () => {
      doc.addPage();
      pageNum++;
      
      // Logos auf jeder Seite
      addLogosToPage();
      
      // Seitenzahl und Linie unterhalb des Headers
      doc.fontSize(8).fillColor(GRAY);
      doc.text(`${data.obj.name} | Seite ${pageNum}`, MARGIN, 65);
      doc.moveTo(MARGIN, 75).lineTo(PAGE_WIDTH - MARGIN, 75).strokeColor(LIGHT_GRAY).stroke();
      y = 85; // Start nach Header und Linie
    };

    const drawLine = () => {
      doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke();
      y += 5;
    };

    // Logo-Funktion für alle Seiten
    const addLogosToPage = () => {
      try {
        // Blauen Header-Hintergrund hinzufügen
        doc.rect(0, 0, PAGE_WIDTH, 60).fill(BLUE);
        
        // TrapMap Logo oben links
        if (trapMapLogoBuffer) {
          console.log("📷 Rendering TrapMap logo to PDF");
          try {
            doc.image(trapMapLogoBuffer, MARGIN, 8, { height: 44 });
          } catch (e) {
            console.log("📷 TrapMap logo image failed, using text fallback");
            // Fallback: Text wenn Logo-Rendering fehlschlägt
            doc.fontSize(14).fillColor("#ffffff").font("Helvetica-Bold");
            doc.text("TRAPMAP", MARGIN, 18);
            doc.fontSize(8).fillColor("#93c5fd").font("Helvetica");
            doc.text("Schädlingsmonitoring", MARGIN, 35);
          }
        } else {
          console.log("📷 TrapMap logo buffer not available, using text fallback");
          // Fallback: Text wenn Logo nicht geladen werden konnte
          doc.fontSize(14).fillColor("#ffffff").font("Helvetica-Bold");
          doc.text("TRAPMAP", MARGIN, 18);
          doc.fontSize(8).fillColor("#93c5fd").font("Helvetica");
          doc.text("Schädlingsmonitoring", MARGIN, 35);
        }

        // Organisations-Logo oben rechts
        if (orgLogoBuffer) {
          console.log("📷 Rendering organization logo to PDF");
          try {
            doc.image(orgLogoBuffer, PAGE_WIDTH - 120, 8, { height: 44 });
          } catch (e) {
            console.log("📷 Organization logo image failed, using text fallback");
            // Fallback bei Rendering-Fehler
            doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold");
            doc.text(data.org?.name || "Organisation", PAGE_WIDTH - 150, 18, { width: 130, align: 'right' });
            
            if (data.org?.address || data.org?.city) {
              doc.fontSize(8).fillColor("#93c5fd").font("Helvetica");
              const address = [data.org?.address, data.org?.city].filter(Boolean).join(", ");
              doc.text(address, PAGE_WIDTH - 150, 35, { width: 130, align: 'right' });
            }
          }
        } else {
          // Organisations-Info als Text wenn kein Logo
          doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold");
          doc.text(data.org?.name || "Organisation", PAGE_WIDTH - 150, 18, { width: 130, align: 'right' });
          
          if (data.org?.address || data.org?.city) {
            doc.fontSize(8).fillColor("#93c5fd").font("Helvetica");
            const address = [data.org?.address, data.org?.city].filter(Boolean).join(", ");
            doc.text(address, PAGE_WIDTH - 150, 35, { width: 130, align: 'right' });
          }
        }
      } catch (e) {
        console.error("Logo rendering error:", e.message);
      }
    };

    // ========== SEITE 1: TITEL ==========
    
    // Logos auch auf der ersten Seite
    addLogosToPage();
    
    // Title nach dem Header
    doc.fontSize(20).fillColor(BLUE).font("Helvetica-Bold");
    doc.text("AUDIT-REPORT", MARGIN, y);
    y += 30;
    
    doc.fontSize(10).fillColor(GRAY).font("Helvetica");
    doc.text("Schädlingsmonitoring", MARGIN, y);
    y += 25;

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
    y += 14;

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
        const category = b.box_types?.category || "-";
        let baitInfo = b.box_types?.bait_type || "-";
        
        // Bei Köder-Boxen mit Gift: Gift mit anzeigen
        if ((category === "giftbox" || category === "bait_box") && b.box_types?.bait_substance) {
          baitInfo = `${baitInfo} (${b.box_types.bait_substance})`;
        }
        
        if (!types[name]) types[name] = { count: 0, cat: category, bait: baitInfo };
        types[name].count++;
      });

      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold");
      doc.text("Typ", MARGIN, y);
      doc.text("Kategorie", MARGIN + 150, y);
      doc.text("Köder/Gift", MARGIN + 280, y);
      doc.text("Anzahl", MARGIN + 420, y);
      y += 12;
      drawLine();

      doc.font("Helvetica").fillColor(BLACK);
      Object.entries(types).forEach(([name, info]) => {
        doc.text(cut(name, 35), MARGIN, y); // Länger: 25 → 35
        doc.text(cut(info.cat, 25), MARGIN + 150, y); // Länger: 20 → 25
        doc.text(cut(info.bait, 30), MARGIN + 280, y); // Länger: 25 → 30
        doc.text(String(info.count), MARGIN + 420, y);
        y += 12; // Mehr Zeilenabstand: 11 → 12
      });
    }

    // ========== ERSTEINRICHTUNG ==========
    
    if (data.boxes.length > 0) {
      if (needsNewPage(300)) addPage();
      
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Ersteinrichtung", MARGIN, y);
      y += 18;

      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold");
      doc.text("Nr", MARGIN, y);
      doc.text("QR-Code", MARGIN + 30, y);
      doc.text("Typ", MARGIN + 100, y);
      doc.text("Köder/Gift", MARGIN + 220, y);
      doc.text("Position", MARGIN + 350, y);
      doc.text("Eingerichtet", MARGIN + 430, y);
      y += 12;
      drawLine();

      doc.font("Helvetica");
      data.boxes.forEach(box => {
        if (needsNewPage(40)) addPage();
        
        const boxType = box.box_types?.name || "Unbekannt";
        const category = box.box_types?.category || "";
        let baitInfo = box.box_types?.bait_type || "-";
        
        // Bei Köder-Boxen mit Gift: Gift mit anzeigen
        if ((category === "giftbox" || category === "bait_box") && box.box_types?.bait_substance) {
          baitInfo = `${baitInfo} (${box.box_types.bait_substance})`;
        }
        
        const position = box.lat && box.lng ? "GPS" : 
                        box.floor_plan_id ? "Lageplan" : 
                        "Nicht platziert";
        
        const setupDate = box.created_at ? formatDate(box.created_at) : "-";

        doc.fillColor(BLACK);
        doc.text(String(box.number || "-"), MARGIN, y);
        doc.text(cut(box.qr_code || "-", 12), MARGIN + 30, y);
        doc.text(cut(boxType, 18), MARGIN + 100, y);
        doc.text(cut(baitInfo, 20), MARGIN + 220, y);
        doc.text(position, MARGIN + 350, y);
        doc.text(setupDate, MARGIN + 430, y);
        
        y += 12;
      });
    }

    // ========== FALLEN-DETAILS ==========
    
    if (data.boxes.length > 0) {
      if (needsNewPage(500)) addPage(); // Höhere Schwelle
      
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Fallenübersicht", MARGIN, y);
      y += 12;

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
        if (needsNewPage(100)) addPage();

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
        doc.text(cut(box.qr_code, 15), MARGIN + 30, y); // Länger: 12 → 15
        doc.text(cut(box.box_types?.name, 22), MARGIN + 100, y); // Länger: 16 → 22
        doc.fillColor(status.color).text(status.label, MARGIN + 200, y);
        doc.fillColor(BLACK).text(formatDate(box.last_scan), MARGIN + 270, y);
        doc.fillColor(overdue ? RED : BLACK).text(nextDue, MARGIN + 370, y);
        
        y += 12; // Mehr Zeilenabstand: 11 → 12
      });
    }

    // ========== SCANS ==========
    
    if (data.scans.length > 0) {
      y += 20; // Abstand zur vorherigen Sektion
      if (needsNewPage(400)) addPage(); // Höhere Schwelle
      
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Kontrollprotokoll", MARGIN, y);
      y += 12;

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
        if (needsNewPage(50)) addPage();
        
        const scan = data.scans[i];
        const status = STATUS_MAP[scan.status] || STATUS_MAP.green;
        const tech = scan.users ? `${scan.users.first_name || ""} ${scan.users.last_name || ""}`.trim() : "-";

        doc.fillColor(BLACK).text(formatDateTime(scan.scanned_at).slice(0, 16), MARGIN, y);
        doc.text(String(scan.boxes?.number || "-"), MARGIN + 90, y);
        doc.fillColor(status.color).text(status.label, MARGIN + 130, y);
        doc.fillColor(BLACK).text(cut(tech, 22), MARGIN + 200, y); // Länger: 18 → 22
        doc.text(cut(scan.notes || scan.findings || "-", 40), MARGIN + 300, y); // Länger: 35 → 40
        
        y += 11; // Mehr Platz: 10 → 11
      }

      if (data.scans.length > maxScans) {
        y += 5;
        doc.fontSize(8).fillColor(GRAY);
        doc.text(`... und ${data.scans.length - maxScans} weitere`, MARGIN, y);
      }
    }

    // ========== TECHNIKER ==========
    
    if (data.technicians.length > 0) {
      // Techniker auf selber Seite halten
      y += 15;
      doc.fontSize(14).fillColor(BLUE).font("Helvetica-Bold");
      doc.text("Techniker", MARGIN, y);
      y += 15;

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

        doc.fillColor(BLACK).text(cut(name, 35), MARGIN, y); // Länger: 30 → 35
        doc.text(String(techScans.length), MARGIN + 200, y);
        doc.fillColor(GREEN).text(String(techScans.filter(s => s.status === "green").length), MARGIN + 280, y);
        doc.fillColor(ORANGE).text(String(techScans.filter(s => ["yellow", "orange"].includes(s.status)).length), MARGIN + 330, y);
        doc.fillColor(RED).text(String(techScans.filter(s => s.status === "red").length), MARGIN + 400, y);
        y += 13; // Mehr Platz: 12 → 13
      });
    }

    // ========== RECHTLICHES ==========
    
    y += 30; // Größerer Abstand
    // Rechtliches nur auf neue Seite wenn wirklich kein Platz (< 150px)
    
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
    
    // Footer nur auf aktueller Seite, keine Iteration über alle Seiten
    doc.fontSize(8).fillColor(GRAY).font("Helvetica");
    doc.text(
      `${formatDateTime(new Date())} | www.trap-map.de`,
      MARGIN, PAGE_HEIGHT - 30,
      { width: CONTENT_WIDTH, align: "center" }
    );

    doc.end();
  });
}

async function loadReportData(objectId, orgId, options = {}) {
  return await loadData(objectId, orgId, options);
}

module.exports = { generateAuditReport, loadReportData };