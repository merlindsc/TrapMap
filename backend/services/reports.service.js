// ============================================
// REPORTS SERVICE - KOMPLETT
// Audit Reports + PDF Generierung
// ============================================

const { supabase } = require("../config/supabase");

// Versuche pdfkit zu laden, falls installiert
let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (e) {
  console.warn("⚠️ pdfkit nicht installiert - PDF Generierung deaktiviert");
}

// ============================================
// HILFSFUNKTIONEN
// ============================================

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const statusText = {
  green: "OK",
  yellow: "Auffällig",
  orange: "Erhöht",
  red: "Befall"
};

// ============================================
// GET OBJECTS (für Dropdown)
// ============================================
exports.getObjects = async (orgId) => {
  try {
    const { data, error } = await supabase
      .from("objects")
      .select("id, name, address, city")
      .eq("organisation_id", orgId)
      .order("name", { ascending: true });

    if (error) {
      console.error("getObjects error:", error);
      return { success: false, message: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error("getObjects exception:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// GET REPORT DATA
// ============================================
exports.getReportData = async (orgId, objectId, startDate, endDate) => {
  try {
    // Objekt laden
    const { data: object, error: objError } = await supabase
      .from("objects")
      .select("*")
      .eq("id", objectId)
      .eq("organisation_id", orgId)
      .single();

    if (objError || !object) {
      return { success: false, message: "Objekt nicht gefunden" };
    }

    // Boxen laden
    const { data: boxes, error: boxError } = await supabase
      .from("boxes")
      .select(`
        *,
        box_types (id, name, category)
      `)
      .eq("object_id", objectId)
      .eq("organisation_id", orgId)
      .eq("active", true)
      .order("number", { ascending: true });

    if (boxError) {
      console.error("Boxes load error:", boxError);
    }

    // Scans im Zeitraum laden
    const { data: scans, error: scanError } = await supabase
      .from("scans")
      .select(`
        *,
        users (id, first_name, last_name),
        boxes (id, number, box_name),
        box_types (id, name)
      `)
      .eq("organisation_id", orgId)
      .gte("scanned_at", startDate)
      .lte("scanned_at", endDate + "T23:59:59")
      .order("scanned_at", { ascending: true });

    if (scanError) {
      console.error("Scans load error:", scanError);
    }

    // Nur Scans für dieses Object filtern
    const objectScans = (scans || []).filter(s => {
      // Entweder direkt object_id oder über box_id
      if (s.object_id === objectId) return true;
      const box = (boxes || []).find(b => b.id === s.box_id);
      return !!box;
    });

    // Statistiken berechnen
    const stats = {
      totalBoxes: boxes?.length || 0,
      totalScans: objectScans.length,
      greenScans: objectScans.filter(s => s.status === "green").length,
      yellowScans: objectScans.filter(s => s.status === "yellow").length,
      redScans: objectScans.filter(s => s.status === "red").length,
      uniqueTechnicians: [...new Set(objectScans.map(s => s.user_id))].length
    };

    // Boxen mit letztem Scan anreichern
    const boxesWithLastScan = (boxes || []).map(box => {
      const boxScans = objectScans.filter(s => s.box_id === box.id);
      const lastScan = boxScans[boxScans.length - 1];
      return {
        ...box,
        lastScan,
        scanCount: boxScans.length
      };
    });

    return {
      success: true,
      data: {
        object,
        boxes: boxesWithLastScan,
        scans: objectScans,
        stats,
        period: { startDate, endDate }
      }
    };
  } catch (err) {
    console.error("getReportData exception:", err);
    return { success: false, message: err.message };
  }
};

// ============================================
// PDF GENERIEREN
// ============================================
exports.generatePDF = async (reportData) => {
  if (!PDFDocument) {
    throw new Error("pdfkit nicht installiert. Bitte 'npm install pdfkit' ausführen.");
  }

  return new Promise((resolve, reject) => {
    const { object, boxes, scans, stats, period } = reportData;
    
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 50,
      bufferPages: true,
      info: {
        Title: `Audit-Report ${object.name}`,
        Author: "TrapMap",
        Subject: "Schädlingsbekämpfung Audit Report"
      }
    });

    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ============================================
    // HEADER
    // ============================================
    doc.fontSize(24).font("Helvetica-Bold").text("AUDIT-REPORT", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Schädlingsbekämpfung", { align: "center" });
    doc.moveDown(2);

    // Objekt-Info Box
    doc.rect(50, doc.y, 495, 80).stroke();
    const infoY = doc.y + 10;
    doc.fontSize(14).font("Helvetica-Bold").text(object.name, 60, infoY);
    doc.fontSize(10).font("Helvetica")
      .text(`${object.address || ""}, ${object.zip || ""} ${object.city || ""}`, 60, infoY + 20)
      .text(`Berichtszeitraum: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 60, infoY + 35)
      .text(`Erstellt am: ${formatDateTime(new Date().toISOString())}`, 60, infoY + 50);
    
    doc.y = infoY + 90;
    doc.moveDown(1);

    // ============================================
    // ZUSAMMENFASSUNG
    // ============================================
    doc.fontSize(14).font("Helvetica-Bold").text("Zusammenfassung");
    doc.moveDown(0.5);

    const summaryData = [
      ["Gesamtanzahl Boxen:", stats.totalBoxes.toString()],
      ["Durchgeführte Kontrollen:", stats.totalScans.toString()],
      ["Eingesetzte Techniker:", stats.uniqueTechnicians.toString()],
      ["Kontrollen OK (grün):", stats.greenScans.toString()],
      ["Kontrollen auffällig (gelb):", stats.yellowScans.toString()],
      ["Kontrollen Befall (rot):", stats.redScans.toString()]
    ];

    doc.fontSize(10).font("Helvetica");
    summaryData.forEach(([label, value]) => {
      doc.text(`${label} ${value}`, { continued: false });
    });

    doc.moveDown(1.5);

    // ============================================
    // BEWERTUNG
    // ============================================
    doc.fontSize(14).font("Helvetica-Bold").text("Bewertung");
    doc.moveDown(0.5);

    const befallRate = stats.totalScans > 0 
      ? ((stats.redScans / stats.totalScans) * 100).toFixed(1) 
      : 0;
    
    let bewertung = "Sehr gut";
    if (befallRate > 5) {
      bewertung = "Kritisch - Maßnahmen erforderlich";
    } else if (befallRate > 2) {
      bewertung = "Auffällig - Beobachtung empfohlen";
    } else if (stats.yellowScans > stats.totalScans * 0.2) {
      bewertung = "Gut - leichte Auffälligkeiten";
    }

    doc.fontSize(12).font("Helvetica-Bold").text(`Gesamtbewertung: ${bewertung}`);
    doc.fontSize(10).font("Helvetica").text(`Befallsrate: ${befallRate}%`);
    
    doc.moveDown(1.5);

    // ============================================
    // BOX-ÜBERSICHT
    // ============================================
    if (boxes && boxes.length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("Box-Übersicht");
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const col1 = 50, col2 = 100, col3 = 220, col4 = 320, col5 = 420;
      
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Nr.", col1, tableTop);
      doc.text("Typ", col2, tableTop);
      doc.text("Letzte Kontrolle", col3, tableTop);
      doc.text("Status", col4, tableTop);
      doc.text("Kontrollen", col5, tableTop);
      
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
      
      let rowY = tableTop + 20;
      doc.fontSize(9).font("Helvetica");
      
      boxes.forEach((box) => {
        if (rowY > 750) {
          doc.addPage();
          rowY = 50;
        }

        const status = box.lastScan?.status || box.current_status || "gray";
        const statusLabel = statusText[status] || "-";
        
        doc.text(box.number?.toString() || "-", col1, rowY);
        doc.text((box.box_types?.name || "-").substring(0, 20), col2, rowY);
        doc.text(box.lastScan ? formatDate(box.lastScan.scanned_at) : "-", col3, rowY);
        doc.text(statusLabel, col4, rowY);
        doc.text((box.scanCount || 0).toString(), col5, rowY);
        
        rowY += 15;
      });
    }

    // ============================================
    // KONTROLL-PROTOKOLL
    // ============================================
    if (scans && scans.length > 0) {
      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").text("Kontroll-Protokoll");
      doc.moveDown(0.5);

      const protTop = doc.y;
      const pCol1 = 50, pCol2 = 130, pCol3 = 180, pCol4 = 250, pCol5 = 320, pCol6 = 400;
      
      doc.fontSize(8).font("Helvetica-Bold");
      doc.text("Datum", pCol1, protTop);
      doc.text("Box", pCol2, protTop);
      doc.text("Typ", pCol3, protTop);
      doc.text("Status", pCol4, protTop);
      doc.text("Techniker", pCol5, protTop);
      doc.text("Bemerkung", pCol6, protTop);
      
      doc.moveTo(50, protTop + 12).lineTo(545, protTop + 12).stroke();
      
      let pRowY = protTop + 16;
      doc.fontSize(8).font("Helvetica");
      
      scans.slice(0, 100).forEach((scan) => {
        if (pRowY > 780) {
          doc.addPage();
          pRowY = 50;
        }

        const techName = scan.users 
          ? `${scan.users.first_name || ""} ${scan.users.last_name || ""}`.trim()
          : "-";
        
        doc.text(formatDate(scan.scanned_at), pCol1, pRowY);
        doc.text(scan.boxes?.number?.toString() || "-", pCol2, pRowY);
        doc.text((scan.box_types?.name || "-").substring(0, 12), pCol3, pRowY);
        doc.text(statusText[scan.status] || "-", pCol4, pRowY);
        doc.text(techName.substring(0, 15), pCol5, pRowY);
        doc.text((scan.notes || "-").substring(0, 20), pCol6, pRowY);
        
        pRowY += 12;
      });

      if (scans.length > 100) {
        doc.moveDown(1);
        doc.fontSize(8).text(`... und ${scans.length - 100} weitere Einträge`);
      }
    }

    // ============================================
    // FOOTER auf jeder Seite
    // ============================================
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(8).font("Helvetica")
        .text(
          `TrapMap Audit-Report | ${object.name} | Seite ${i + 1} von ${totalPages}`,
          50,
          doc.page.height - 30,
          { align: "center", width: 495 }
        );
    }

    doc.end();
  });
};