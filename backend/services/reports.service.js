// ============================================
// REPORTS SERVICE - KOMPAKT
// Max 2-3 Seiten, Fotos eingebettet
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
// PDF GENERATION - KOMPAKT (Max 2-3 Seiten)
// ============================================
exports.generatePDF = async (reportData, options = {}) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert - npm install pdfkit");

  const { object, organisation, boxes, scans, scansWithPhotos, stats, period } = reportData;
  
  // Logo laden
  const logoBuffer = organisation?.logo_url ? await loadImage(organisation.logo_url) : null;
  
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
      // HEADER (Kompakt)
      // ========================================
      doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
      
      if (logoBuffer) {
        try { doc.image(logoBuffer, 40, 12, { height: 45 }); } catch (e) {}
      }

      doc.fontSize(16).fillColor(COLORS.white);
      doc.text("Kontroll-Protokoll", logoBuffer ? 150 : 40, 18);
      doc.fontSize(10).text(object.name, logoBuffer ? 150 : 40, 38);
      
      doc.fontSize(9).fillColor(COLORS.white);
      doc.text(`${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 400, 25, { align: "right", width: 140 });
      doc.text(`Erstellt: ${formatDate(new Date())}`, 400, 38, { align: "right", width: 140 });

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
      // BOX-ÜBERSICHT (Kompakte Tabelle)
      // ========================================
      if (options.includeBoxList !== false) {
        doc.fontSize(11).fillColor(COLORS.primary).text("Box-Übersicht", 40, y);
        y += 18;

        // Tabellen-Header
        doc.fontSize(7).fillColor(COLORS.gray);
        doc.text("Nr", 42, y, { width: 25 });
        doc.text("Typ", 70, y, { width: 120 });
        doc.text("Status", 195, y, { width: 50 });
        doc.text("Scans", 250, y, { width: 35 });
        doc.text("Letzte Kontrolle", 290, y, { width: 90 });
        doc.text("Techniker", 385, y, { width: 130 });
        
        doc.moveTo(40, y + 10).lineTo(pageWidth + 40, y + 10).strokeColor(COLORS.lightGray).stroke();
        y += 14;

        // Tabellen-Zeilen (Kompakt - 14px pro Zeile)
        boxes.forEach((box, i) => {
          // Neue Seite wenn nötig
          if (y > pageHeight - 80) {
            doc.addPage();
            y = 50;
          }

          // Zebra-Streifen
          if (i % 2 === 0) {
            doc.rect(40, y - 2, pageWidth, 14).fill("#fafafa");
          }

          const lastStatus = box.lastScan?.status || "none";
          const techName = box.lastScan?.users 
            ? `${box.lastScan.users.first_name} ${box.lastScan.users.last_name}`.substring(0, 20)
            : "-";

          doc.fontSize(9).fillColor(COLORS.black);
          doc.text(box.displayNumber?.toString() || "?", 42, y, { width: 25 });
          
          doc.fontSize(8).fillColor(COLORS.darkGray);
          doc.text((box.box_types?.name || "Unbekannt").substring(0, 22), 70, y, { width: 120 });
          
          drawStatusDot(195, y, lastStatus);
          doc.fontSize(7).fillColor(STATUS_CONFIG[lastStatus]?.color || COLORS.gray);
          doc.text(STATUS_CONFIG[lastStatus]?.label || "-", 205, y, { width: 40 });
          
          doc.fillColor(COLORS.black).text(box.scanCount?.toString() || "0", 250, y, { width: 35, align: "center" });
          
          doc.fontSize(7).fillColor(COLORS.gray);
          doc.text(box.lastScan ? formatDateTime(box.lastScan.scanned_at) : "-", 290, y, { width: 90 });
          doc.text(techName, 385, y, { width: 130 });

          y += 14;
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

        doc.fontSize(11).fillColor(COLORS.primary).text("Zusammenfassung", 40, y);
        y += 16;

        doc.fontSize(9).fillColor(COLORS.darkGray);
        
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

        doc.fontSize(11).fillColor(COLORS.primary).text(`Foto-Dokumentation (${loadedPhotos.length})`, 40, y);
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
            doc.fontSize(7).fillColor(COLORS.black);
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

        doc.fontSize(11).fillColor(COLORS.primary).text(`Zusätzliche Fotos (${customPhotos.length})`, 40, y);
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
              doc.fontSize(7).fillColor(COLORS.darkGray);
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
        
        doc.fontSize(7).fillColor(COLORS.gray);
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
// GEFAHRENANALYSE PDF (Kompakt)
// ============================================
exports.generateGefahrenanalyse = async (formData, organisation) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert");

  const logoBuffer = organisation?.logo_url ? await loadImage(organisation.logo_url) : null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.rect(0, 0, doc.page.width, 100).fill(COLORS.primary);
      
      if (logoBuffer) {
        try { doc.image(logoBuffer, 50, 20, { height: 60 }); } catch (e) {}
      }

      doc.fontSize(18).fillColor(COLORS.white).text("Gefahrenanalyse", logoBuffer ? 180 : 50, 35);
      doc.fontSize(9).text("zur Notwendigkeit einer befallsunabhängigen Dauerbeköderung", logoBuffer ? 180 : 50, 58);
      
      let y = 120;

      // Objekt-Info
      if (formData.objekt) {
        doc.fontSize(12).fillColor(COLORS.primary).text("Objekt", 50, y);
        y += 18;
        
        doc.fontSize(10).fillColor(COLORS.darkGray);
        if (formData.objekt.firma) { doc.text(`Firma: ${formData.objekt.firma}`, 50, y); y += 14; }
        if (formData.objekt.adresse) { doc.text(`Adresse: ${formData.objekt.adresse}`, 50, y); y += 14; }
        if (formData.objekt.ansprechpartner) { doc.text(`Ansprechpartner: ${formData.objekt.ansprechpartner}`, 50, y); y += 14; }
        y += 15;
      }

      // Bewertung
      if (formData.bewertung) {
        doc.fontSize(12).fillColor(COLORS.primary).text("Bewertung", 50, y);
        y += 18;
        
        doc.fontSize(10).fillColor(COLORS.darkGray);
        Object.entries(formData.bewertung).forEach(([key, value]) => {
          if (value) { doc.text(`${key}: ${value}`, 50, y); y += 14; }
        });
        y += 15;
      }

      // Ergebnis
      if (formData.ergebnis) {
        doc.fontSize(12).fillColor(COLORS.primary).text("Ergebnis", 50, y);
        y += 18;
        doc.fontSize(10).fillColor(COLORS.black).text(formData.ergebnis, 50, y, { width: doc.page.width - 100 });
        y += 50;
      }

      // Unterschriften
      y += 30;
      doc.fontSize(9).fillColor(COLORS.gray).text(`Datum: ${formatDate(new Date())}`, 50, y);
      y += 40;
      
      doc.moveTo(50, y).lineTo(230, y).strokeColor(COLORS.gray).stroke();
      doc.moveTo(280, y).lineTo(460, y).stroke();
      y += 8;
      doc.fontSize(8).text("Unterschrift Schädlingsbekämpfer", 50, y);
      doc.text("Unterschrift Kunde", 280, y);

      // Footer
      doc.fontSize(7).fillColor(COLORS.gray);
      doc.text("Erstellt mit TrapMap - www.trap-map.de", 50, doc.page.height - 40);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};