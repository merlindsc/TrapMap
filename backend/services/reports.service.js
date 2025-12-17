// ============================================
// REPORTS SERVICE - KOMPAKT
// Max 2-3 Seiten, Fotos eingebettet
// MIT TRAPMAP LOGO LINKS + FIRMEN-LOGO RECHTS
// ============================================

const { supabase } = require("../config/supabase");

let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (e) {
  console.warn("⚠️ pdfkit nicht installiert - npm install pdfkit");
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (d) => d ? new Date(d).toLocaleDateString("de-DE") : "";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("de-DE", { 
  day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" 
}) : "";

// Farben
const COLORS = {
  primary: "#1e40af",
  secondary: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  gray: "#6b7280",
  lightGray: "#f3f4f6",
  darkGray: "#374151",
  white: "#ffffff",
  black: "#111827"
};

const STATUS_CONFIG = {
  green: { label: "OK", color: COLORS.green },
  yellow: { label: "Auffällig", color: COLORS.yellow },
  orange: { label: "Erhöht", color: COLORS.orange },
  red: { label: "Befall", color: COLORS.red },
  none: { label: "-", color: COLORS.gray }
};

// ============================================
// DATABASE FUNCTIONS
// ============================================
exports.getObjects = async (orgId) => {
  const { data, error } = await supabase
    .from("objects")
    .select("*")
    .eq("organisation_id", orgId)
    .order("name", { ascending: true });
  
  return error 
    ? { success: false, message: error.message } 
    : { success: true, data: data || [] };
};

exports.getOrganisation = async (orgId) => {
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", orgId)
    .single();
  
  return error 
    ? { success: false, message: error.message } 
    : { success: true, data };
};

exports.updateOrganisation = async (orgId, updateData) => {
  const { data, error } = await supabase
    .from("organisations")
    .update(updateData)
    .eq("id", orgId)
    .select()
    .single();
  
  return error 
    ? { success: false, message: error.message } 
    : { success: true, data };
};

exports.getOrganisationLogo = async (orgId) => {
  const { data, error } = await supabase
    .from("organisations")
    .select("logo_url")
    .eq("id", orgId)
    .single();
  
  return error 
    ? { success: false, message: error.message } 
    : { success: true, logoUrl: data?.logo_url };
};

exports.uploadLogo = async (orgId, buffer, filename, mimetype) => {
  try {
    const ext = filename.split('.').pop();
    const path = `logos/${orgId}/logo.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, buffer, { contentType: mimetype, upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    const logoUrl = urlData.publicUrl;
    
    await supabase.from("organisations").update({ logo_url: logoUrl }).eq("id", orgId);
    
    return { success: true, logoUrl };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// ============================================
// REPORT DATA - MIT FOTOS!
// ============================================
exports.getReportData = async (orgId, objectId, startDate, endDate) => {
  try {
    const { data: object } = await supabase
      .from("objects")
      .select("*")
      .eq("id", objectId)
      .eq("organisation_id", orgId)
      .single();
    
    if (!object) return { success: false, message: "Objekt nicht gefunden" };

    const { data: organisation } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", orgId)
      .single();

    // Boxen mit Nummer sortiert
    const { data: boxes } = await supabase
      .from("boxes")
      .select("*, box_types (id, name, category)")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .eq("active", true)
      .order("number", { ascending: true });

    // Scans im Zeitraum
    const { data: scans } = await supabase
      .from("scans")
      .select("*, users (id, first_name, last_name), boxes (id, number, qr_code)")
      .eq("organisation_id", orgId)
      .gte("scanned_at", startDate)
      .lte("scanned_at", endDate + "T23:59:59")
      .order("scanned_at", { ascending: false });

    // Nur Scans für dieses Objekt
    const boxIds = (boxes || []).map(b => b.id);
    const objectScans = (scans || []).filter(s => boxIds.includes(s.box_id));

    // Statistiken
    const stats = {
      totalBoxes: boxes?.length || 0,
      totalScans: objectScans.length,
      greenScans: objectScans.filter(s => s.status === "green").length,
      yellowScans: objectScans.filter(s => s.status === "yellow").length,
      orangeScans: objectScans.filter(s => s.status === "orange").length,
      redScans: objectScans.filter(s => s.status === "red").length,
      uniqueTechnicians: [...new Set(objectScans.map(s => s.user_id))].length
    };

    // Boxen mit letztem Scan anreichern
    const boxesWithLastScan = (boxes || []).map(box => {
      const boxScans = objectScans.filter(s => s.box_id === box.id);
      const lastScan = boxScans[0]; // Neuester zuerst
      
      // Box-Nummer aus QR-Code falls number fehlt
      let displayNumber = box.number;
      if (!displayNumber && box.qr_code) {
        const match = box.qr_code.match(/(\d+)$/);
        if (match) displayNumber = parseInt(match[1], 10);
      }
      
      return { 
        ...box, 
        displayNumber: displayNumber || box.id,
        lastScan, 
        scanCount: boxScans.length 
      };
    }).sort((a, b) => (a.displayNumber || 999) - (b.displayNumber || 999));

    // Fotos laden (max 8 für Report)
    const scansWithPhotos = objectScans
      .filter(s => s.photo_url)
      .slice(0, 8);

    return { 
      success: true, 
      data: { 
        object, 
        organisation, 
        boxes: boxesWithLastScan, 
        scans: objectScans, 
        scansWithPhotos,
        stats, 
        period: { startDate, endDate } 
      } 
    };
  } catch (err) {
    console.error("getReportData error:", err);
    return { success: false, message: err.message };
  }
};

// Preview für Dialog
exports.getPhotosForReport = async (orgId, objectId, startDate, endDate, sizeOrCount = "thumbnail") => {
  try {
    if (sizeOrCount === "count") {
      const { data: boxes } = await supabase
        .from("boxes")
        .select("id")
        .eq("object_id", objectId)
        .eq("organisation_id", orgId)
        .eq("active", true);
      
      const boxIds = (boxes || []).map(b => b.id);
      
      const { count } = await supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .in("box_id", boxIds)
        .eq("organisation_id", orgId)
        .not("photo_url", "is", null)
        .gte("scanned_at", startDate)
        .lte("scanned_at", endDate + "T23:59:59");

      return { success: true, count: count || 0 };
    }
    return { success: true, data: [] };
  } catch (err) {
    return { success: false, message: err.message, data: [] };
  }
};

// ============================================
// IMAGE LOADING
// ============================================
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
  } catch {
    return null;
  }
};

// ============================================
// TRAPMAP LOGO URL (Öffentlich gehostet)
// ============================================
const TRAPMAP_LOGO_URL = "https://trap-map.de/trapmap-logo.png";

// ============================================
// PDF GENERATION - KOMPAKT (Max 2-3 Seiten)
// MIT TRAPMAP LOGO LINKS + FIRMEN-LOGO RECHTS
// ============================================
exports.generatePDF = async (reportData, options = {}) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert - npm install pdfkit");

  const { object, organisation, boxes, scans, scansWithPhotos, stats, period } = reportData;
  
  // TrapMap Logo laden - local file first, then URL
  let trapMapLogoBuffer = null;
  try {
    const logoPath = require('path').join(__dirname, "../../frontend/public/logo.png");
    if (require('fs').existsSync(logoPath)) {
      trapMapLogoBuffer = require('fs').readFileSync(logoPath);
      console.log("📷 TrapMap logo loaded from local file, size:", trapMapLogoBuffer.length, "bytes");
    } else {
      trapMapLogoBuffer = await loadImage(TRAPMAP_LOGO_URL);
      if (trapMapLogoBuffer) {
        console.log("📷 TrapMap logo loaded from URL, size:", trapMapLogoBuffer.length, "bytes");
      }
    }
  } catch (e) {
    console.log("📷 TrapMap logo loading failed:", e.message);
  }
  
  // Company Logo laden
  const companyLogoBuffer = organisation?.logo_url ? await loadImage(organisation.logo_url) : null;
  
  // Scan-Fotos laden wenn gewünscht
  const loadedPhotos = [];
  if (options.includePhotos && scansWithPhotos && scansWithPhotos.length > 0) {
    console.log(`📸 Loading ${scansWithPhotos.length} scan photos...`);
    for (const scan of scansWithPhotos) {
      const buffer = await loadImage(scan.photo_url);
      if (buffer) {
        loadedPhotos.push({
          buffer,
          box_number: scan.boxes?.number || scan.boxes?.qr_code?.match(/(\d+)$/)?.[1] || "?",
          status: scan.status,
          scanned_at: scan.scanned_at,
          technician: scan.users ? `${scan.users.first_name} ${scan.users.last_name}` : ""
        });
      }
    }
    console.log(`📸 Loaded ${loadedPhotos.length} photos`);
  }

  // Custom Fotos
  const customPhotos = options.customPhotos || [];

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margins: { top: 40, bottom: 50, left: 40, right: 40 },
        bufferPages: true
      });
      const chunks = [];
      
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 80;
      const pageHeight = doc.page.height;
      let y = 40;

      // ========================================
      // HELPER: Status Punkt
      // ========================================
      const drawStatusDot = (x, y, status, size = 6) => {
        const color = STATUS_CONFIG[status]?.color || COLORS.gray;
        doc.circle(x + size/2, y + size/2, size/2).fill(color);
      };

      // ========================================
      // HEADER MIT BEIDEN LOGOS
      // TrapMap links, Firmen-Logo rechts
      // ========================================
      doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
      
      // LINKS: TrapMap Logo oder Text
      if (trapMapLogoBuffer) {
        try { 
          doc.image(trapMapLogoBuffer, 40, 12, { height: 45 }); 
        } catch (e) {
          // Fallback: Text
          doc.fontSize(18).fillColor(COLORS.white).font('Helvetica-Bold');
          doc.text("TrapMap", 40, 20);
          doc.fontSize(7).font('Helvetica').fillColor("#93c5fd");
          doc.text("Pest Control Management", 40, 40);
        }
      } else {
        // Kein Logo - Text verwenden
        doc.fontSize(18).fillColor(COLORS.white).font('Helvetica-Bold');
        doc.text("TrapMap", 40, 20);
        doc.fontSize(7).font('Helvetica').fillColor("#93c5fd");
        doc.text("Pest Control Management", 40, 40);
      }

      // MITTE: Titel + Objekt
      doc.fontSize(14).fillColor(COLORS.white).font('Helvetica-Bold');
      doc.text("Kontroll-Protokoll", 180, 15, { width: 180, align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text(object.name.length > 25 ? object.name.substring(0, 25) + "..." : object.name, 180, 33, { width: 180, align: 'center' });
      doc.fontSize(8).fillColor("#bfdbfe");
      doc.text(`${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 180, 48, { width: 180, align: 'center' });

      // RECHTS: Firmen-Logo oder Name
      if (companyLogoBuffer) {
        try { 
          doc.image(companyLogoBuffer, doc.page.width - 130, 10, { height: 50 }); 
        } catch (e) {
          // Fallback: Firmenname
          doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold');
          doc.text(organisation?.name || "", doc.page.width - 180, 20, { width: 140, align: 'right' });
        }
      } else if (organisation?.name) {
        doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold');
        doc.text(organisation.name, doc.page.width - 180, 18, { width: 140, align: 'right' });
        if (organisation.city) {
          doc.fontSize(8).font('Helvetica').fillColor("#93c5fd");
          doc.text(organisation.city, doc.page.width - 180, 32, { width: 140, align: 'right' });
        }
      }

      y = 85;

      // ========================================
      // STATISTIK-ZEILE (Eine Zeile)
      // ========================================
      doc.roundedRect(40, y, pageWidth, 35, 4).fill(COLORS.lightGray);
      
      const statWidth = pageWidth / 5;
      const statItems = [
        { label: "Boxen", value: stats.totalBoxes, color: COLORS.primary },
        { label: "Kontrollen", value: stats.totalScans, color: COLORS.primary },
        { label: "OK", value: stats.greenScans, color: COLORS.green },
        { label: "Auffällig", value: stats.yellowScans + stats.orangeScans, color: COLORS.orange },
        { label: "Befall", value: stats.redScans, color: COLORS.red }
      ];
      
      statItems.forEach((stat, i) => {
        const x = 40 + (i * statWidth);
        doc.fontSize(16).fillColor(stat.color).text(stat.value.toString(), x, y + 6, { width: statWidth, align: "center" });
        doc.fontSize(7).fillColor(COLORS.gray).text(stat.label, x, y + 23, { width: statWidth, align: "center" });
      });

      y += 45;

      // ========================================
      // BOX-ÜBERSICHT (Optimierte Tabelle)
      // ========================================
      if (options.includeBoxList !== false) {
        doc.fontSize(12).fillColor(COLORS.primary).font('Helvetica-Bold').text("Box-Übersicht", 40, y);
        y += 20;

        // Optimierte Spaltenbreiten (breitere Typ-Spalte)
        const col1 = 40;   // Nr
        const col2 = 70;   // Typ (breiter!)
        const col3 = 220;  // Status  
        const col4 = 270;  // Scans
        const col5 = 310;  // Letzte Kontrolle
        const col6 = 440;  // Techniker

        // Tabellen-Header (größere Schrift)
        doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica-Bold');
        doc.text("Nr", col1, y, { width: 25 });
        doc.text("Boxtyp", col2, y, { width: 145 });
        doc.text("Status", col3, y, { width: 45 });
        doc.text("Scans", col4, y, { width: 35, align: "center" });
        doc.text("Letzte Kontrolle", col5, y, { width: 125 });
        doc.text("Techniker", col6, y, { width: 100 });
        
        doc.moveTo(40, y + 12).lineTo(pageWidth + 40, y + 12).strokeColor(COLORS.lightGray).stroke();
        y += 18;

        // Tabellen-Zeilen (mehr Platz - 18px pro Zeile)
        boxes.forEach((box, i) => {
          // Neue Seite wenn nötig
          if (y > pageHeight - 100) {
            doc.addPage();
            y = 50;
          }

          // Zebra-Streifen (höher)
          if (i % 2 === 0) {
            doc.rect(40, y - 3, pageWidth, 18).fill("#fafafa");
          }

          const lastStatus = box.lastScan?.status || "none";
          const techName = box.lastScan?.users 
            ? `${box.lastScan.users.first_name} ${box.lastScan.users.last_name}`
            : "-";
          
          // Box-Typ ohne Abkürzung
          const boxTypeName = box.box_types?.name || "Unbekannt";

          // Datenzeile (größere Schrift, mehr Platz)
          doc.font('Helvetica').fontSize(9).fillColor(COLORS.black);
          doc.text(box.displayNumber?.toString() || "?", col1 + 2, y + 2, { width: 25 });
          
          doc.fontSize(8).fillColor(COLORS.darkGray);
          doc.text(boxTypeName, col2 + 2, y + 2, { width: 140, lineBreak: false });
          
          drawStatusDot(col3 + 2, y + 4, lastStatus, 8);
          doc.fontSize(8).fillColor(STATUS_CONFIG[lastStatus]?.color || COLORS.gray);
          doc.text(STATUS_CONFIG[lastStatus]?.label || "-", col3 + 15, y + 2, { width: 30 });
          
          doc.fontSize(8).fillColor(COLORS.black);
          doc.text(box.scanCount?.toString() || "0", col4, y + 2, { width: 35, align: "center" });
          
          doc.fontSize(7).fillColor(COLORS.gray);
          doc.text(box.lastScan ? formatDateTime(box.lastScan.scanned_at) : "-", col5 + 2, y + 2, { width: 120 });
          doc.text(techName.length > 15 ? techName.substring(0, 15) + "..." : techName, col6 + 2, y + 2, { width: 95 });

          y += 18; // Mehr Zeilenabstand
        });
      }

      // ========================================
      // ZUSAMMENFASSUNG (Optional, Kompakt)
      // ========================================
      if (options.includeSummary) {
        y += 10;
        if (y > pageHeight - 100) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold').text("Zusammenfassung", 40, y);
        y += 16;

        doc.fontSize(9).fillColor(COLORS.darkGray).font('Helvetica');
        
        const totalIssues = stats.yellowScans + stats.orangeScans + stats.redScans;
        const okRate = stats.totalScans > 0 
          ? Math.round((stats.greenScans / stats.totalScans) * 100) 
          : 0;

        doc.text(`• ${stats.totalScans} Kontrollen durchgeführt, davon ${stats.greenScans} ohne Befund (${okRate}%)`, 45, y);
        y += 12;
        
        if (totalIssues > 0) {
          doc.text(`• ${totalIssues} Auffälligkeiten festgestellt (${stats.yellowScans} gering, ${stats.orangeScans} erhöht, ${stats.redScans} Befall)`, 45, y);
          y += 12;
        }
        
        doc.text(`• ${stats.uniqueTechnicians} Techniker im Einsatz`, 45, y);
        y += 12;
      }

      // ========================================
      // SCAN-FOTOS (Max 8, 4 pro Reihe)
      // ========================================
      if (options.includePhotos && loadedPhotos.length > 0) {
        y += 15;
        if (y > pageHeight - 200) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold').text(`Foto-Dokumentation (${loadedPhotos.length})`, 40, y);
        y += 18;

        const imgSize = 120;
        const spacing = 8;
        const cols = 4;

        loadedPhotos.forEach((photo, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          
          if (col === 0 && row > 0) {
            y += imgSize + 35;
          }
          
          if (y + imgSize > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }

          const x = 40 + (col * (imgSize + spacing));
          
          try {
            doc.image(photo.buffer, x, y, { 
              fit: [imgSize, imgSize - 15],
              align: "center"
            });
            
            // Info unter Foto
            drawStatusDot(x, y + imgSize - 12, photo.status, 5);
            doc.fontSize(7).fillColor(COLORS.black).font('Helvetica');
            doc.text(`Box ${photo.box_number}`, x + 8, y + imgSize - 12, { width: imgSize - 10 });
            doc.fontSize(6).fillColor(COLORS.gray);
            doc.text(formatDateTime(photo.scanned_at), x, y + imgSize - 2, { width: imgSize });
          } catch (err) {
            console.warn(`Foto ${i + 1} konnte nicht eingefügt werden`);
          }
        });
        
        y += imgSize + 35;
      }

      // ========================================
      // CUSTOM FOTOS (Optional)
      // ========================================
      if (options.includeCustomPhotos && customPhotos.length > 0) {
        if (y > pageHeight - 200) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold').text(`Zusätzliche Fotos (${customPhotos.length})`, 40, y);
        y += 18;

        const imgSize = customPhotos.length <= 4 ? 180 : 120;
        const cols = customPhotos.length <= 4 ? 2 : 4;
        const spacing = 10;

        customPhotos.forEach((photo, i) => {
          const col = i % cols;
          
          if (col === 0 && i > 0) {
            y += imgSize + 25;
          }
          
          if (y + imgSize > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }

          const x = 40 + (col * (imgSize + spacing));
          
          try {
            doc.image(photo.buffer, x, y, { 
              fit: [imgSize, imgSize - 20],
              align: "center"
            });
            
            if (photo.caption) {
              doc.fontSize(7).fillColor(COLORS.darkGray).font('Helvetica');
              doc.text(photo.caption, x, y + imgSize - 15, { width: imgSize });
            }
          } catch (err) {
            console.warn(`Custom-Foto ${i + 1} konnte nicht eingefügt werden`);
          }
        });
      }

      // ========================================
      // FOOTER AUF ALLEN SEITEN
      // ========================================
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        
        const footerY = pageHeight - 35;
        doc.moveTo(40, footerY).lineTo(pageWidth + 40, footerY).strokeColor(COLORS.lightGray).stroke();
        
        doc.fontSize(7).fillColor(COLORS.gray).font('Helvetica');
        doc.text(`${object.name} | ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 40, footerY + 8);
        doc.text(`Seite ${i + 1} von ${pages.count}`, pageWidth - 20, footerY + 8, { align: "right", width: 80 });
        doc.text("TrapMap", pageWidth / 2, footerY + 8, { align: "center", width: 80 });
      }

      doc.end();
    } catch (err) {
      console.error("PDF generation error:", err);
      reject(err);
    }
  });
};

// ============================================
// GEFAHRENANALYSE PDF - KORRIGIERT!
// MIT TRAPMAP LOGO LINKS + FIRMEN-LOGO RECHTS
// ============================================
exports.generateGefahrenanalyse = async (formData, organisation) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert");

  console.log("📄 Gefahrenanalyse formData:", JSON.stringify(formData, null, 2));

  // TrapMap Logo laden - local file first, then URL
  let trapMapLogoBuffer = null;
  try {
    const logoPath = require('path').join(__dirname, "../../frontend/public/logo.png");
    if (require('fs').existsSync(logoPath)) {
      trapMapLogoBuffer = require('fs').readFileSync(logoPath);
      console.log("📷 Gefahrenanalyse: TrapMap logo loaded from local file, size:", trapMapLogoBuffer.length, "bytes");
    } else {
      trapMapLogoBuffer = await loadImage(TRAPMAP_LOGO_URL);
      if (trapMapLogoBuffer) {
        console.log("📷 Gefahrenanalyse: TrapMap logo loaded from URL, size:", trapMapLogoBuffer.length, "bytes");
      }
    }
  } catch (e) {
    console.log("📷 Gefahrenanalyse: TrapMap logo loading failed:", e.message);
  }
  
  // Company Logo laden
  const companyLogoBuffer = organisation?.logo_url ? await loadImage(organisation.logo_url) : null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true
      });
      const chunks = [];
      
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 100;
      let y = 50;

      // ========================================
      // HEADER MIT BEIDEN LOGOS
      // TrapMap links, Firmen-Logo rechts
      // ========================================
      doc.rect(0, 0, doc.page.width, 90).fill(COLORS.primary);
      
      // LINKS: TrapMap Logo oder Text
      if (trapMapLogoBuffer) {
        try { 
          doc.image(trapMapLogoBuffer, 50, 15, { height: 60 }); 
        } catch (e) {
          doc.fontSize(20).fillColor(COLORS.white).font('Helvetica-Bold');
          doc.text("TrapMap", 50, 25);
          doc.fontSize(8).font('Helvetica').fillColor("#93c5fd");
          doc.text("Pest Control Management", 50, 48);
        }
      } else {
        doc.fontSize(20).fillColor(COLORS.white).font('Helvetica-Bold');
        doc.text("TrapMap", 50, 25);
        doc.fontSize(8).font('Helvetica').fillColor("#93c5fd");
        doc.text("Pest Control Management", 50, 48);
      }

      // MITTE: Titel
      doc.fontSize(16).fillColor(COLORS.white).font('Helvetica-Bold');
      doc.text("Gefahrenanalyse", 180, 20, { width: 200, align: 'center' });
      doc.fontSize(8).font('Helvetica');
      doc.text("zur Notwendigkeit einer", 180, 42, { width: 200, align: 'center' });
      doc.text("befallsunabhängigen Dauerbeköderung", 180, 52, { width: 200, align: 'center' });
      doc.fontSize(7).fillColor("#bfdbfe");
      doc.text("gemäß Biozid-VO (EU) Nr. 528/2012", 180, 65, { width: 200, align: 'center' });

      // RECHTS: Firmen-Logo oder Name
      if (companyLogoBuffer) {
        try { 
          doc.image(companyLogoBuffer, doc.page.width - 140, 15, { height: 60 }); 
        } catch (e) {
          if (organisation?.name) {
            doc.fontSize(11).fillColor(COLORS.white).font('Helvetica-Bold');
            doc.text(organisation.name, doc.page.width - 190, 25, { width: 140, align: 'right' });
          }
        }
      } else if (organisation?.name) {
        doc.fontSize(11).fillColor(COLORS.white).font('Helvetica-Bold');
        doc.text(organisation.name, doc.page.width - 190, 25, { width: 140, align: 'right' });
        if (organisation.city) {
          doc.fontSize(9).font('Helvetica').fillColor("#93c5fd");
          doc.text(organisation.city, doc.page.width - 190, 40, { width: 140, align: 'right' });
        }
      }
      
      y = 110;

      // ========================================
      // HELPER: Adress-Box zeichnen
      // ========================================
      const drawAddressBox = (title, icon, data, x, boxWidth, startY) => {
        const boxHeight = 100;
        
        // Box Background
        doc.roundedRect(x, startY, boxWidth, boxHeight, 4)
           .fillAndStroke("#f8fafc", "#e2e8f0");
        
        // Titel
        doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold').text(title, x + 10, startY + 8);
        
        // Daten
        doc.fontSize(9).fillColor(COLORS.black).font('Helvetica');
        let textY = startY + 25;
        
        if (data.firma) { 
          doc.font('Helvetica-Bold').text(data.firma, x + 10, textY, { width: boxWidth - 20 }); 
          textY += 14; 
        }
        doc.font('Helvetica');
        if (data.strasse) { doc.text(data.strasse, x + 10, textY, { width: boxWidth - 20 }); textY += 12; }
        if (data.plzOrt) { doc.text(data.plzOrt, x + 10, textY, { width: boxWidth - 20 }); textY += 12; }
        if (data.verantwortlicher) { 
          doc.fontSize(8).fillColor(COLORS.gray);
          doc.text(`Ansprechpartner: ${data.verantwortlicher}`, x + 10, textY, { width: boxWidth - 20 }); 
          textY += 10; 
        }
        if (data.telefon) { 
          doc.fontSize(8).fillColor(COLORS.gray);
          doc.text(`Tel: ${data.telefon}`, x + 10, textY, { width: boxWidth - 20 }); 
        }
        
        return boxHeight;
      };

      // ========================================
      // DREI SPALTEN: Dienstleister, Auftraggeber, Objekt
      // ========================================
      const colWidth = (pageWidth - 20) / 3;
      
      drawAddressBox("Dienstleister", "🏢", formData.dienstleister || {}, 50, colWidth, y);
      drawAddressBox("Auftraggeber", "👤", formData.auftraggeber || {}, 50 + colWidth + 10, colWidth, y);
      drawAddressBox("Objekt", "📍", formData.objekt || {}, 50 + (colWidth + 10) * 2, colWidth, y);
      
      y += 115;

      // ========================================
      // DURCHFÜHRUNG
      // ========================================
      doc.roundedRect(50, y, pageWidth, 45, 4).fillAndStroke("#f0fdf4", "#bbf7d0");
      
      doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold').text("Durchführung der Gefahrenanalyse", 60, y + 8);
      
      doc.fontSize(9).fillColor(COLORS.black).font('Helvetica');
      const durchf = formData.durchfuehrung || {};
      doc.text(`Datum: ${durchf.datum || formatDate(new Date())}`, 60, y + 25);
      doc.text(`Durchgeführt von: ${durchf.durch || "-"}`, 250, y + 25);
      
      y += 55;

      // ========================================
      // DOKUMENTATION
      // ========================================
      doc.roundedRect(50, y, pageWidth, 50, 4).fillAndStroke("#fefce8", "#fef08a");
      
      doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold').text("Aktuelle Dokumentation", 60, y + 8);
      
      const doku = formData.dokumentation || {};
      doc.fontSize(9).fillColor(COLORS.black).font('Helvetica');
      
      // Checkboxen
      const checkX = 60;
      let checkY = y + 25;
      
      const drawCheck = (label, checked, x) => {
        doc.rect(x, checkY, 10, 10).stroke(COLORS.gray);
        if (checked) {
          doc.fontSize(12).fillColor(COLORS.green).text("✓", x + 1, checkY - 2);
        }
        doc.fontSize(8).fillColor(COLORS.black).font('Helvetica').text(label, x + 15, checkY + 1);
      };
      
      drawCheck("APC Integral", doku.apcIntegral, checkX);
      drawCheck("APC DocuWeb", doku.apcDocuWeb, checkX + 100);
      drawCheck("TrapMap", doku.trapmap, checkX + 200);
      
      doc.fontSize(9).text(`Behandlungen jährlich: ${formData.behandlungenJaehrlich || "-"}`, checkX + 320, checkY + 1);
      
      y += 60;

      // ========================================
      // KRITERIEN (Die 3 Fragen)
      // ========================================
      doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold').text("Voraussetzungen für eine Dauerbeköderung", 50, y);
      doc.fontSize(8).fillColor(COLORS.gray).font('Helvetica').text("Alle drei Kriterien müssen mit JA beantwortet werden.", 50, y + 14);
      y += 30;

      const kriterienTexte = [
        "1. Ausschließlicher Einsatz dauerhaft kontrollierter Köderstellen an Eintritts- und Einniststellen. Verwendung von zugriffgeschützten Köderboxen.",
        "2. Erhöhte Befallsgefahr durch Nagetiere mit besonderer Gefahr für die Gesundheit oder Sicherheit von Mensch und Tier.",
        "3. Keine Möglichkeit der Verhinderung des Nagetierbefalls durch verhältnismäßige alternative Maßnahmen (baulich, toxinfrei)."
      ];

      const kriterien = formData.kriterien || [{}, {}, {}];
      
      kriterienTexte.forEach((text, i) => {
        const isJa = kriterien[i]?.ja === true;
        const isNein = kriterien[i]?.nein === true;
        const bgColor = isJa ? "#f0fdf4" : (isNein ? "#fef2f2" : "#f9fafb");
        const borderColor = isJa ? "#86efac" : (isNein ? "#fecaca" : "#e5e7eb");
        
        doc.roundedRect(50, y, pageWidth, 45, 4).fillAndStroke(bgColor, borderColor);
        
        doc.fontSize(8).fillColor(COLORS.darkGray).font('Helvetica');
        doc.text(text, 60, y + 8, { width: pageWidth - 100 });
        
        // JA / NEIN Buttons
        const btnY = y + 28;
        
        // JA Button
        doc.roundedRect(pageWidth - 30, btnY, 35, 14, 2)
           .fillAndStroke(isJa ? COLORS.green : "#fff", isJa ? COLORS.green : "#d1d5db");
        doc.fontSize(8).fillColor(isJa ? "#fff" : COLORS.gray).text("JA", pageWidth - 25, btnY + 3);
        
        // NEIN Button
        doc.roundedRect(pageWidth + 10, btnY, 40, 14, 2)
           .fillAndStroke(isNein ? COLORS.red : "#fff", isNein ? COLORS.red : "#d1d5db");
        doc.fontSize(8).fillColor(isNein ? "#fff" : COLORS.gray).text("NEIN", pageWidth + 15, btnY + 3);
        
        y += 52;
      });

      // ========================================
      // EMPFEHLUNG
      // ========================================
      y += 5;
      doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold').text("Empfehlung", 50, y);
      y += 18;

      const empfehlungen = [
        { id: 1, text: "Beibehaltung des aktuellen Inspektionsintervalls (<12 Behandlungen/Jahr). Bei akutem Befall: temporäre Umstellung von NeoTox auf Tox-Beköderung." },
        { id: 2, text: "Befallsunabhängige Dauerbeköderung mit Rodentiziden. Kontrollintervall: 1-4 Wochen je nach Befallsdruck." }
      ];

      empfehlungen.forEach((emp) => {
        const isSelected = formData.empfehlung === emp.id;
        const bgColor = isSelected ? "#eff6ff" : "#f9fafb";
        const borderColor = isSelected ? "#3b82f6" : "#e5e7eb";
        
        doc.roundedRect(50, y, pageWidth, 35, 4).fillAndStroke(bgColor, borderColor);
        
        // Radio Button
        doc.circle(68, y + 17, 6).stroke(isSelected ? COLORS.secondary : COLORS.gray);
        if (isSelected) {
          doc.circle(68, y + 17, 3).fill(COLORS.secondary);
        }
        
        doc.fontSize(8).fillColor(COLORS.darkGray).font('Helvetica');
        doc.text(emp.text, 85, y + 8, { width: pageWidth - 50 });
        
        y += 42;
      });

      // ========================================
      // UNTERSCHRIFTEN (Neue Seite wenn nötig)
      // ========================================
      if (y > 680) {
        doc.addPage();
        y = 50;
      } else {
        y += 30;
      }

      doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold').text("Unterschriften", 50, y);
      y += 20;

      // Datum
      doc.fontSize(9).fillColor(COLORS.gray).font('Helvetica');
      doc.text(`Ort, Datum: ________________________________`, 50, y);
      y += 40;

      // Unterschriftenlinien
      doc.moveTo(50, y).lineTo(250, y).stroke(COLORS.gray);
      doc.moveTo(300, y).lineTo(500, y).stroke(COLORS.gray);
      
      doc.fontSize(8).fillColor(COLORS.gray);
      doc.text("Unterschrift Schädlingsbekämpfer", 50, y + 5);
      doc.text("Unterschrift Auftraggeber/Kunde", 300, y + 5);

      // ========================================
      // FOOTER
      // ========================================
      const footerY = doc.page.height - 40;
      doc.fontSize(7).fillColor(COLORS.gray);
      doc.text("Erstellt mit TrapMap - www.trap-map.de", 50, footerY);
      doc.text(`Generiert am ${formatDate(new Date())}`, pageWidth - 50, footerY, { align: "right", width: 150 });

      doc.end();
    } catch (err) {
      console.error("Gefahrenanalyse PDF error:", err);
      reject(err);
    }
  });
};