// ============================================
// REPORTS SERVICE - PROFESSIONELL
// Sauberes Design, Fotos, TrapMap Branding
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
const formatDateTime = (d) => d ? new Date(d).toLocaleString("de-DE") : "";
const formatTime = (d) => d ? new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";

// Farben
const COLORS = {
  primary: "#1e40af",      // Dunkelblau
  secondary: "#3b82f6",    // Blau
  accent: "#06b6d4",       // Cyan
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
  none: { label: "Nicht geprüft", color: COLORS.gray }
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

    const { data: boxes } = await supabase
      .from("boxes")
      .select("*, box_types (id, name, category)")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .eq("active", true)
      .order("number", { ascending: true });

    const { data: scans } = await supabase
      .from("scans")
      .select("*, users (id, first_name, last_name), boxes (id, number), box_types (id, name)")
      .eq("organisation_id", orgId)
      .gte("scanned_at", startDate)
      .lte("scanned_at", endDate + "T23:59:59")
      .order("scanned_at", { ascending: true });

    const objectScans = (scans || []).filter(s => 
      s.object_id === parseInt(objectId) || (boxes || []).some(b => b.id === s.box_id)
    );

    const stats = {
      totalBoxes: boxes?.length || 0,
      totalScans: objectScans.length,
      greenScans: objectScans.filter(s => s.status === "green").length,
      yellowScans: objectScans.filter(s => s.status === "yellow").length,
      orangeScans: objectScans.filter(s => s.status === "orange").length,
      redScans: objectScans.filter(s => s.status === "red").length,
      uniqueTechnicians: [...new Set(objectScans.map(s => s.user_id))].length
    };

    const boxesWithLastScan = (boxes || []).map(box => {
      const bs = objectScans.filter(s => s.box_id === box.id);
      return { ...box, lastScan: bs[bs.length - 1], scanCount: bs.length };
    });

    return { 
      success: true, 
      data: { object, organisation, boxes: boxesWithLastScan, scans: objectScans, stats, period: { startDate, endDate } } 
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

exports.getPhotosForReport = async (orgId, objectId, startDate, endDate, sizeOrCount = "thumbnail") => {
  try {
    if (sizeOrCount === "count") {
      const { count } = await supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("object_id", objectId)
        .eq("organisation_id", orgId)
        .not("photo_url", "is", null)
        .gte("scanned_at", startDate)
        .lte("scanned_at", endDate + "T23:59:59");

      return { success: true, count: count || 0 };
    }

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const effectiveStartDate = new Date(startDate) < twoYearsAgo 
      ? twoYearsAgo.toISOString().split("T")[0] 
      : startDate;

    const { data: scans } = await supabase
      .from("scans")
      .select("id, scanned_at, photo_url, status, notes, box_id, boxes (id, number, box_types(name)), users (first_name, last_name)")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .not("photo_url", "is", null)
      .gte("scanned_at", effectiveStartDate)
      .lte("scanned_at", endDate + "T23:59:59")
      .order("scanned_at", { ascending: false })
      .limit(30);

    if (!scans || scans.length === 0) {
      return { success: true, data: [] };
    }

    const photos = scans.map(s => ({
      scan_id: s.id,
      box_id: s.box_id,
      box_number: s.boxes?.number || "?",
      box_type: s.boxes?.box_types?.name || "Unbekannt",
      scanned_at: s.scanned_at,
      status: s.status,
      notes: s.notes,
      technician: s.users ? `${s.users.first_name} ${s.users.last_name}` : "Unbekannt",
      photo_url: s.photo_url,
      size: sizeOrCount
    }));

    return { success: true, data: photos };
  } catch (err) {
    console.error("getPhotosForReport error:", err);
    return { success: false, message: err.message, data: [] };
  }
};

exports.getFloorplanForReport = async (orgId, objectId) => {
  try {
    const { data: floorplans } = await supabase
      .from("floor_plans")
      .select("*")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .order("name", { ascending: true });

    const { data: object } = await supabase
      .from("objects")
      .select("id, name, lat, lng")
      .eq("id", objectId)
      .single();

    const { data: boxes } = await supabase
      .from("boxes")
      .select("id, number, lat, lng, floor_plan_id, floor_x, floor_y, status, box_types (name, category)")
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .eq("active", true)
      .order("number", { ascending: true });

    const boxesByFloorplan = {};
    const boxesOnMap = [];

    (boxes || []).forEach(box => {
      if (box.floor_plan_id && box.floor_x && box.floor_y) {
        if (!boxesByFloorplan[box.floor_plan_id]) {
          boxesByFloorplan[box.floor_plan_id] = [];
        }
        boxesByFloorplan[box.floor_plan_id].push(box);
      } else if (box.lat && box.lng) {
        boxesOnMap.push(box);
      }
    });

    return {
      success: true,
      data: {
        object,
        floorplans: floorplans || [],
        boxesByFloorplan,
        boxesOnMap,
        hasFloorplans: (floorplans || []).length > 0,
        hasMapPositions: boxesOnMap.length > 0,
        totalBoxes: (boxes || []).length
      }
    };
  } catch (err) {
    return { success: false, message: err.message, data: null };
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
      const timeout = setTimeout(() => resolve(null), 15000);
      
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
// PDF GENERATION - PROFESSIONAL
// ============================================
exports.generatePDF = async (reportData) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert - npm install pdfkit");

  const { 
    object, organisation, boxes, scans, stats, period,
    photos = [], floorplanData, options = {}
  } = reportData;
  
  const logoBuffer = organisation?.logo_url ? await loadImage(organisation.logo_url) : null;
  
  // Fotos vorladen wenn gewünscht
  const loadedPhotos = [];
  if (options.includePhotos && photos.length > 0) {
    console.log(`📸 Loading ${photos.length} photos...`);
    for (const photo of photos.slice(0, 20)) {
      const buffer = await loadImage(photo.photo_url);
      if (buffer) {
        loadedPhotos.push({ ...photo, buffer });
      }
    }
    console.log(`📸 Loaded ${loadedPhotos.length} photos successfully`);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: "A4", 
        margins: { top: 50, bottom: 70, left: 50, right: 50 },
        bufferPages: true
      });
      const chunks = [];
      
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 100;
      const pageHeight = doc.page.height;

      // ========================================
      // HELPER: Draw Status Dot
      // ========================================
      const drawStatusDot = (x, y, status, size = 8) => {
        const color = STATUS_CONFIG[status]?.color || COLORS.gray;
        doc.circle(x + size/2, y + size/2, size/2).fill(color);
      };

      // ========================================
      // HELPER: Draw Section Header
      // ========================================
      const drawSectionHeader = (title, y) => {
        doc.rect(50, y, pageWidth, 28).fill(COLORS.primary);
        doc.fontSize(14).fillColor(COLORS.white).text(title, 60, y + 7);
        return y + 38;
      };

      // ========================================
      // HELPER: Footer
      // ========================================
      const addFooter = (pageNum, totalPages) => {
        const footerY = pageHeight - 50;
        
        doc.moveTo(50, footerY).lineTo(pageWidth + 50, footerY).strokeColor(COLORS.lightGray).stroke();
        
        doc.fontSize(8).fillColor(COLORS.gray);
        doc.text("Erstellt mit TrapMap - Professionelle Schädlingsüberwachung", 50, footerY + 8, { width: 200 });
        doc.text("www.trap-map.de", 50, footerY + 18);
        
        doc.text(`Seite ${pageNum} von ${totalPages}`, pageWidth - 50, footerY + 12, { width: 100, align: "right" });
      };

      // ========================================
      // PAGE 1: DECKBLATT
      // ========================================
      
      doc.rect(0, 0, doc.page.width, 200).fill(COLORS.primary);
      doc.rect(0, 200, doc.page.width, 8).fill(COLORS.secondary);
      
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 30, { height: 80 });
        } catch (e) {
          console.warn("Logo konnte nicht eingefügt werden");
        }
      }
      
      doc.fontSize(32).fillColor(COLORS.white).text("AUDIT-REPORT", 50, 130, { width: pageWidth });
      
      doc.fontSize(28).fillColor(COLORS.black).text(object.name, 50, 240);
      
      doc.fontSize(14).fillColor(COLORS.darkGray);
      doc.text(`Berichtszeitraum: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 50, 290);
      doc.text(`Erstellt am: ${formatDateTime(new Date())}`, 50, 310);
      
      doc.moveTo(50, 350).lineTo(250, 350).strokeColor(COLORS.secondary).lineWidth(3).stroke();
      
      if (organisation) {
        doc.fontSize(11).fillColor(COLORS.darkGray);
        let infoY = 380;
        if (organisation.name) { doc.text(organisation.name, 50, infoY); infoY += 16; }
        if (organisation.address) { doc.text(organisation.address, 50, infoY); infoY += 16; }
        if (organisation.zip || organisation.city) { 
          doc.text(`${organisation.zip || ""} ${organisation.city || ""}`.trim(), 50, infoY); 
          infoY += 16; 
        }
        if (organisation.phone) { doc.text(`Tel: ${organisation.phone}`, 50, infoY); infoY += 16; }
        if (organisation.email) { doc.text(organisation.email, 50, infoY); }
      }
      
      const statsBoxY = 500;
      doc.roundedRect(50, statsBoxY, pageWidth, 100, 8).fill(COLORS.lightGray);
      
      const statWidth = pageWidth / 4;
      const statItems = [
        { label: "Boxen", value: stats.totalBoxes, color: COLORS.primary },
        { label: "Kontrollen", value: stats.totalScans, color: COLORS.secondary },
        { label: "Techniker", value: stats.uniqueTechnicians, color: COLORS.accent },
        { label: "Befälle", value: stats.redScans, color: stats.redScans > 0 ? COLORS.red : COLORS.green }
      ];
      
      statItems.forEach((item, i) => {
        const x = 50 + (i * statWidth) + 20;
        doc.fontSize(24).fillColor(item.color).text(item.value.toString(), x, statsBoxY + 25, { width: statWidth - 40 });
        doc.fontSize(10).fillColor(COLORS.gray).text(item.label, x, statsBoxY + 60, { width: statWidth - 40 });
      });

      // ========================================
      // PAGE 2: ZUSAMMENFASSUNG & STATUS
      // ========================================
      doc.addPage();
      
      let y = drawSectionHeader("Zusammenfassung", 50);
      
      doc.fontSize(11).fillColor(COLORS.black);
      doc.text(`Objekt: ${object.name}`, 60, y);
      y += 18;
      if (object.address) {
        doc.fontSize(10).fillColor(COLORS.darkGray);
        doc.text(`Adresse: ${object.address}`, 60, y);
        y += 16;
      }
      if (object.city) {
        doc.text(`${object.zip || ""} ${object.city}`.trim(), 60, y);
        y += 16;
      }
      
      y += 20;
      
      y = drawSectionHeader("Status-Verteilung", y);
      
      const totalScans = stats.totalScans || 1;
      const barHeight = 30;
      const barY = y + 10;
      
      doc.roundedRect(60, barY, pageWidth - 20, barHeight, 4).fill(COLORS.lightGray);
      
      let barX = 60;
      const statusData = [
        { count: stats.greenScans, color: COLORS.green, label: "OK" },
        { count: stats.yellowScans, color: COLORS.yellow, label: "Auffällig" },
        { count: stats.orangeScans || 0, color: COLORS.orange, label: "Erhöht" },
        { count: stats.redScans, color: COLORS.red, label: "Befall" }
      ];
      
      statusData.forEach(s => {
        if (s.count > 0) {
          const width = ((s.count / totalScans) * (pageWidth - 20));
          if (barX === 60) {
            doc.roundedRect(barX, barY, width, barHeight, 4).fill(s.color);
          } else {
            doc.rect(barX, barY, width, barHeight).fill(s.color);
          }
          barX += width;
        }
      });
      
      y = barY + barHeight + 20;
      
      let legendX = 60;
      statusData.forEach(s => {
        doc.circle(legendX + 5, y + 5, 5).fill(s.color);
        doc.fontSize(10).fillColor(COLORS.black).text(`${s.label}: ${s.count}`, legendX + 15, y);
        legendX += 120;
      });
      
      y += 40;

      // ========================================
      // KONTROLLEN-DETAILS
      // ========================================
      if (options.includeScans !== false && scans.length > 0) {
        y = drawSectionHeader("Kontrollen-Protokoll", y);
        
        doc.fontSize(9).fillColor(COLORS.gray);
        doc.text("Status", 60, y + 5, { width: 50 });
        doc.text("Box", 115, y + 5, { width: 60 });
        doc.text("Typ", 180, y + 5, { width: 100 });
        doc.text("Datum / Uhrzeit", 290, y + 5, { width: 100 });
        doc.text("Techniker", 400, y + 5, { width: 100 });
        
        y += 25;
        doc.moveTo(60, y - 5).lineTo(pageWidth + 40, y - 5).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
        
        scans.forEach((scan, i) => {
          if (y > pageHeight - 100) {
            doc.addPage();
            y = 60;
          }
          
          if (i % 2 === 0) {
            doc.rect(55, y - 3, pageWidth - 5, 22).fill("#f9fafb");
          }
          
          drawStatusDot(60, y, scan.status);
          
          doc.fontSize(10).fillColor(COLORS.black);
          doc.text(scan.boxes?.number?.toString() || "?", 115, y, { width: 60 });
          
          doc.fontSize(9).fillColor(COLORS.darkGray);
          doc.text(scan.box_types?.name || "-", 180, y, { width: 105 });
          
          doc.text(formatDateTime(scan.scanned_at), 290, y, { width: 105 });
          
          const techName = scan.users ? `${scan.users.first_name} ${scan.users.last_name}` : "-";
          doc.text(techName, 400, y, { width: 100 });
          
          y += 22;
          
          if (scan.notes) {
            doc.fontSize(8).fillColor(COLORS.gray);
            doc.text(`  → ${scan.notes}`, 75, y - 2, { width: pageWidth - 35 });
            y += 14;
          }
        });
      }

      // ========================================
      // BOX-ÜBERSICHT
      // ========================================
      doc.addPage();
      y = drawSectionHeader("Box-Übersicht", 50);
      
      doc.fontSize(9).fillColor(COLORS.gray);
      doc.text("Nr.", 60, y + 5, { width: 40 });
      doc.text("Box-Typ", 105, y + 5, { width: 140 });
      doc.text("Status", 260, y + 5, { width: 80 });
      doc.text("Kontrollen", 350, y + 5, { width: 60 });
      doc.text("Letzte Kontrolle", 420, y + 5, { width: 120 });
      
      y += 25;
      doc.moveTo(60, y - 5).lineTo(pageWidth + 40, y - 5).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
      
      boxes.forEach((box, i) => {
        if (y > pageHeight - 100) {
          doc.addPage();
          y = 60;
        }
        
        if (i % 2 === 0) {
          doc.rect(55, y - 3, pageWidth - 5, 20).fill("#f9fafb");
        }
        
        const lastStatus = box.lastScan?.status || "none";
        
        doc.fontSize(11).fillColor(COLORS.black).text(box.number?.toString() || "?", 60, y, { width: 40 });
        
        doc.fontSize(10).fillColor(COLORS.darkGray).text(box.box_types?.name || "Unbekannt", 105, y, { width: 140 });
        
        drawStatusDot(260, y, lastStatus);
        doc.fontSize(9).fillColor(STATUS_CONFIG[lastStatus]?.color || COLORS.gray);
        doc.text(STATUS_CONFIG[lastStatus]?.label || "-", 275, y, { width: 70 });
        
        doc.fillColor(COLORS.black).text(box.scanCount?.toString() || "0", 350, y, { width: 60, align: "center" });
        
        doc.fontSize(9).fillColor(COLORS.gray);
        doc.text(box.lastScan ? formatDateTime(box.lastScan.scanned_at) : "-", 420, y, { width: 120 });
        
        y += 20;
      });

      // ========================================
      // FOTO-DOKUMENTATION
      // ========================================
      if (options.includePhotos && loadedPhotos.length > 0) {
        doc.addPage();
        y = drawSectionHeader("Foto-Dokumentation", 50);
        
        doc.fontSize(10).fillColor(COLORS.darkGray);
        doc.text(`${loadedPhotos.length} Fotos im Berichtszeitraum`, 60, y);
        y += 30;
        
        const photoSize = options.photoSize || "medium";
        const imgWidth = photoSize === "full" ? 450 : (photoSize === "medium" ? 220 : 140);
        const imgHeight = photoSize === "full" ? 300 : (photoSize === "medium" ? 160 : 100);
        const cols = photoSize === "full" ? 1 : 2;
        
        loadedPhotos.forEach((photo, i) => {
          const col = i % cols;
          const needNewPage = col === 0 && y + imgHeight + 60 > pageHeight - 80;
          
          if (needNewPage) {
            doc.addPage();
            y = 60;
          }
          
          const x = 60 + (col * (imgWidth + 30));
          
          try {
            doc.image(photo.buffer, x, y, { 
              fit: [imgWidth, imgHeight],
              align: "center",
              valign: "center"
            });
            
            doc.rect(x, y, imgWidth, imgHeight).strokeColor(COLORS.lightGray).stroke();
            
            const infoY = y + imgHeight + 5;
            
            drawStatusDot(x, infoY, photo.status, 6);
            
            doc.fontSize(9).fillColor(COLORS.black);
            doc.text(`Box ${photo.box_number}`, x + 12, infoY, { width: imgWidth - 12 });
            
            doc.fontSize(8).fillColor(COLORS.gray);
            doc.text(`${photo.box_type} | ${formatDateTime(photo.scanned_at)}`, x, infoY + 12, { width: imgWidth });
            doc.text(photo.technician, x, infoY + 22, { width: imgWidth });
            
            if (photo.notes) {
              doc.fontSize(7).fillColor(COLORS.darkGray);
              doc.text(photo.notes, x, infoY + 32, { width: imgWidth });
            }
            
          } catch (err) {
            console.warn(`Foto ${i + 1} konnte nicht eingefügt werden`);
          }
          
          if (col === cols - 1 || i === loadedPhotos.length - 1) {
            y += imgHeight + 70;
          }
        });
      }

      // ========================================
      // SCHLUSS-SEITE
      // ========================================
      doc.addPage();
      
      doc.rect(0, 0, doc.page.width, 100).fill(COLORS.primary);
      doc.fontSize(20).fillColor(COLORS.white).text("Report-Informationen", 50, 40);
      
      y = 130;
      
      doc.fontSize(11).fillColor(COLORS.black);
      doc.text(`Berichtszeitraum: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 60, y);
      y += 20;
      doc.text(`Erstellt am: ${formatDateTime(new Date())}`, 60, y);
      y += 20;
      doc.text(`Objekt: ${object.name}`, 60, y);
      y += 40;
      
      doc.roundedRect(50, y, pageWidth, 60, 5).fill(COLORS.lightGray);
      doc.fontSize(10).fillColor(COLORS.darkGray);
      doc.text("Aufbewahrungsfristen gemäß HACCP/IFS:", 60, y + 10);
      doc.fontSize(9);
      doc.text("• Scan-Daten und Protokolle: 5 Jahre", 70, y + 28);
      doc.text("• Foto-Dokumentation: 2 Jahre", 70, y + 42);
      
      y += 90;
      
      doc.roundedRect(50, y, pageWidth, 120, 8).fillAndStroke(COLORS.white, COLORS.secondary);
      
      doc.fontSize(14).fillColor(COLORS.primary);
      doc.text("Erstellt mit TrapMap", 70, y + 15);
      
      doc.fontSize(10).fillColor(COLORS.darkGray);
      doc.text("Professionelle Schädlingsüberwachung für Ihr Unternehmen", 70, y + 38);
      doc.text("• Digitale Dokumentation aller Kontrollen", 70, y + 58);
      doc.text("• HACCP & IFS konforme Audit-Reports", 70, y + 72);
      doc.text("• GPS-Tracking und Lagepläne", 70, y + 86);
      
      doc.fontSize(11).fillColor(COLORS.secondary);
      doc.text("www.trap-map.de", 70, y + 105);
      
      // ========================================
      // FOOTER AUF ALLEN SEITEN
      // ========================================
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        addFooter(i + 1, pages.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================
// GEFAHRENANALYSE PDF
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

      doc.rect(0, 0, doc.page.width, 120).fill(COLORS.primary);
      
      if (logoBuffer) {
        try { doc.image(logoBuffer, 50, 25, { height: 70 }); } catch (e) {}
      }

      doc.fontSize(22).fillColor(COLORS.white).text("Gefahrenanalyse", 50, 85);
      
      doc.fontSize(10).fillColor(COLORS.darkGray);
      doc.text("zur Notwendigkeit einer befallsunabhängigen Dauerbeköderung", 50, 140);
      
      let y = 180;

      if (formData.objekt) {
        doc.rect(50, y, doc.page.width - 100, 28).fill(COLORS.primary);
        doc.fontSize(12).fillColor(COLORS.white).text("Objekt-Informationen", 60, y + 8);
        y += 38;
        
        doc.fontSize(10).fillColor(COLORS.darkGray);
        if (formData.objekt.firma) { doc.text(`Firma: ${formData.objekt.firma}`, 60, y); y += 16; }
        if (formData.objekt.adresse) { doc.text(`Adresse: ${formData.objekt.adresse}`, 60, y); y += 16; }
        if (formData.objekt.ansprechpartner) { doc.text(`Ansprechpartner: ${formData.objekt.ansprechpartner}`, 60, y); y += 16; }
        y += 20;
      }

      if (formData.bewertung) {
        doc.rect(50, y, doc.page.width - 100, 28).fill(COLORS.primary);
        doc.fontSize(12).fillColor(COLORS.white).text("Bewertung", 60, y + 8);
        y += 38;
        
        doc.fontSize(10).fillColor(COLORS.darkGray);
        Object.entries(formData.bewertung).forEach(([key, value]) => {
          if (value) { doc.text(`${key}: ${value}`, 60, y); y += 16; }
        });
        y += 20;
      }

      if (formData.ergebnis) {
        doc.rect(50, y, doc.page.width - 100, 28).fill(COLORS.primary);
        doc.fontSize(12).fillColor(COLORS.white).text("Ergebnis", 60, y + 8);
        y += 38;
        
        doc.fontSize(11).fillColor(COLORS.black).text(formData.ergebnis, 60, y, { width: doc.page.width - 120 });
        y += 40;
      }

      y += 40;
      doc.fontSize(10).fillColor(COLORS.gray).text(`Datum: ${formatDate(new Date())}`, 60, y);
      y += 50;
      
      doc.moveTo(60, y).lineTo(250, y).strokeColor(COLORS.gray).stroke();
      doc.moveTo(300, y).lineTo(490, y).stroke();
      y += 5;
      doc.fontSize(9).text("Unterschrift Schädlingsbekämpfer", 60, y);
      doc.text("Unterschrift Kunde", 300, y);

      doc.fontSize(8).fillColor(COLORS.gray);
      doc.text("Erstellt mit TrapMap - www.trap-map.de", 50, doc.page.height - 50);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
