// ============================================
// REPORTS SERVICE - VERSION 5 (FINAL)
// Seitennummer oben rechts, KEIN Footer der Seiten erstellt
// ============================================

const { supabase } = require("../config/supabase");

let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (e) {
  console.warn("⚠️ pdfkit nicht installiert");
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString("de-DE") : "-";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("de-DE") : "-";
const statusText = { green: "OK", yellow: "Auffällig", orange: "Erhöht", red: "Befall" };

exports.getObjects = async (orgId) => {
  const { data, error } = await supabase
    .from("objects").select("id, name, address, city")
    .eq("organisation_id", orgId).order("name", { ascending: true });
  return error ? { success: false, message: error.message } : { success: true, data: data || [] };
};

exports.getReportData = async (orgId, objectId, startDate, endDate) => {
  try {
    const { data: object } = await supabase
      .from("objects").select("*")
      .eq("id", objectId).eq("organisation_id", orgId).single();
    if (!object) return { success: false, message: "Objekt nicht gefunden" };

    const { data: organisation } = await supabase
      .from("organisations").select("id, name, logo_url")
      .eq("id", orgId).single();

    const { data: boxes } = await supabase
      .from("boxes").select("*, box_types (id, name, category)")
      .eq("object_id", objectId).eq("organisation_id", orgId).eq("active", true)
      .order("number", { ascending: true });

    const { data: scans } = await supabase
      .from("scans").select("*, users (id, first_name, last_name), boxes (id, number), box_types (id, name)")
      .eq("organisation_id", orgId)
      .gte("scanned_at", startDate).lte("scanned_at", endDate + "T23:59:59")
      .order("scanned_at", { ascending: true });

    const objectScans = (scans || []).filter(s => 
      s.object_id === parseInt(objectId) || (boxes || []).some(b => b.id === s.box_id)
    );

    const stats = {
      totalBoxes: boxes?.length || 0,
      totalScans: objectScans.length,
      greenScans: objectScans.filter(s => s.status === "green").length,
      yellowScans: objectScans.filter(s => s.status === "yellow").length,
      redScans: objectScans.filter(s => s.status === "red").length,
      uniqueTechnicians: [...new Set(objectScans.map(s => s.user_id))].length
    };

    const boxesWithLastScan = (boxes || []).map(box => {
      const bs = objectScans.filter(s => s.box_id === box.id);
      return { ...box, lastScan: bs[bs.length - 1], scanCount: bs.length };
    });

    return { success: true, data: { object, organisation, boxes: boxesWithLastScan, scans: objectScans, stats, period: { startDate, endDate } } };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

const loadLogo = async (url) => {
  if (!url) return null;
  try {
    const proto = url.startsWith('https') ? require('https') : require('http');
    return new Promise(r => {
      const t = setTimeout(() => r(null), 5000);
      proto.get(url, res => {
        if (res.statusCode !== 200) { clearTimeout(t); return r(null); }
        const c = []; res.on('data', d => c.push(d));
        res.on('end', () => { clearTimeout(t); r(Buffer.concat(c)); });
        res.on('error', () => { clearTimeout(t); r(null); });
      }).on('error', () => { clearTimeout(t); r(null); });
    });
  } catch { return null; }
};

// ============================================
// PDF GENERIEREN - VERSION 5
// ============================================
exports.generatePDF = async (reportData) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert");

  const { object, organisation, boxes, scans, stats, period } = reportData;
  const logoBuffer = organisation?.logo_url ? await loadLogo(organisation.logo_url) : null;
  const orgName = organisation?.name || "TrapMap";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: "A4", 
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 100;
    const BOTTOM = 750;
    let pageNum = 1;

    // Header für Folgeseiten
    const addPageHeader = () => {
      doc.fontSize(8).font("Helvetica").fillColor("#999999");
      doc.text(`${orgName} | ${object.name} | Seite ${pageNum}`, 50, 30, { align: "right", width: W });
      doc.fillColor("#000000");
      doc.moveTo(50, 45).lineTo(545, 45).stroke("#eeeeee");
    };

    // Neue Seite
    const newPage = () => {
      doc.addPage();
      pageNum++;
      addPageHeader();
      return 55; // Start nach Header
    };

    // ============================================
    // SEITE 1 - CONTENT
    // ============================================
    
    // Logo oben rechts
    if (logoBuffer) {
      try { doc.image(logoBuffer, doc.page.width - 130, 30, { fit: [80, 40] }); } catch {}
    }

    doc.fontSize(24).font("Helvetica-Bold").fillColor("#000000").text("AUDIT-REPORT", 50, 50);
    doc.fontSize(11).font("Helvetica").text("Schädlingsbekämpfung");
    doc.moveDown(1.5);

    // Info-Box
    const iy = doc.y;
    doc.rect(50, iy, W, 70).stroke("#cccccc");
    doc.fontSize(14).font("Helvetica-Bold").text(object.name, 60, iy + 10);
    doc.fontSize(10).font("Helvetica")
      .text(`${object.address || ""}, ${object.zip || ""} ${object.city || ""}`, 60, iy + 28)
      .text(`Berichtszeitraum: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 60, iy + 42)
      .text(`Erstellt am: ${formatDateTime(new Date())}`, 60, iy + 56);
    doc.y = iy + 85;

    // Zusammenfassung
    doc.fontSize(14).font("Helvetica-Bold").text("Zusammenfassung");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Gesamtanzahl Boxen: ${stats.totalBoxes}`);
    doc.text(`Durchgeführte Kontrollen: ${stats.totalScans}`);
    doc.text(`Eingesetzte Techniker: ${stats.uniqueTechnicians}`);
    doc.text(`Kontrollen OK (grün): ${stats.greenScans}`);
    doc.text(`Kontrollen auffällig (gelb): ${stats.yellowScans}`);
    doc.text(`Kontrollen Befall (rot): ${stats.redScans}`);
    doc.moveDown(1);

    // Bewertung
    doc.fontSize(14).font("Helvetica-Bold").text("Bewertung");
    doc.moveDown(0.3);
    const rate = stats.totalScans > 0 ? ((stats.redScans / stats.totalScans) * 100).toFixed(1) : 0;
    let bew = "Sehr gut";
    if (rate > 5) bew = "Kritisch - Maßnahmen erforderlich";
    else if (rate > 2) bew = "Auffällig - Beobachtung empfohlen";
    else if (stats.yellowScans > stats.totalScans * 0.2) bew = "Gut - leichte Auffälligkeiten";
    doc.fontSize(11).font("Helvetica-Bold").text(`Gesamtbewertung: ${bew}`);
    doc.font("Helvetica").fontSize(10).text(`Befallsrate: ${rate}%`);
    doc.moveDown(1);

    // BOX-ÜBERSICHT
    if (boxes?.length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("Box-Übersicht");
      doc.moveDown(0.3);
      
      let y = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Nr.", 50, y); doc.text("Typ", 85, y); doc.text("Letzte Kontrolle", 200, y);
      doc.text("Status", 310, y); doc.text("Kontrollen", 400, y);
      doc.moveTo(50, y + 12).lineTo(545, y + 12).stroke("#cccccc");
      y += 18;
      
      doc.fontSize(9).font("Helvetica");
      for (const box of boxes) {
        if (y > BOTTOM) y = newPage();
        const st = box.lastScan?.status || box.current_status || "green";
        doc.text(box.number?.toString() || "-", 50, y);
        doc.text((box.box_types?.name || "-").substring(0, 18), 85, y);
        doc.text(box.lastScan ? formatDate(box.lastScan.scanned_at) : "-", 200, y);
        doc.text(statusText[st] || "OK", 310, y);
        doc.text((box.scanCount || 0).toString(), 400, y);
        y += 14;
      }
      doc.y = y + 10;
    }

    // KONTROLL-PROTOKOLL
    if (scans?.length > 0) {
      if (doc.y > BOTTOM - 60) doc.y = newPage();
      else doc.moveDown(1);

      doc.fontSize(14).font("Helvetica-Bold").text("Kontroll-Protokoll");
      doc.moveDown(0.3);

      let y = doc.y;
      doc.fontSize(8).font("Helvetica-Bold");
      doc.text("Datum", 50, y); doc.text("Box", 115, y); doc.text("Typ", 150, y);
      doc.text("Status", 235, y); doc.text("Techniker", 300, y); doc.text("Bemerkung", 400, y);
      doc.moveTo(50, y + 10).lineTo(545, y + 10).stroke("#cccccc");
      y += 14;

      doc.fontSize(8).font("Helvetica");
      const max = Math.min(scans.length, 100);
      for (let i = 0; i < max; i++) {
        if (y > BOTTOM) y = newPage();
        const s = scans[i];
        const tech = s.users ? `${s.users.first_name || ""} ${s.users.last_name || ""}`.trim() : "-";
        doc.text(formatDate(s.scanned_at), 50, y);
        doc.text(s.boxes?.number?.toString() || "-", 115, y);
        doc.text((s.box_types?.name || "-").substring(0, 12), 150, y);
        doc.text(statusText[s.status] || "-", 235, y);
        doc.text(tech.substring(0, 15), 300, y);
        doc.text((s.notes || "-").substring(0, 20), 400, y);
        y += 11;
      }
      if (scans.length > 100) {
        doc.y = y + 5;
        doc.fontSize(8).fillColor("#666666").text(`... und ${scans.length - 100} weitere`);
        doc.fillColor("#000000");
      }
    }

    // KEIN Footer am Ende - vermeidet extra Seiten!

    doc.end();
  });
};

exports.uploadLogo = async (orgId, fileBuffer, fileName, mimeType) => {
  try {
    const ext = fileName.split('.').pop();
    const path = `logos/${orgId}/logo.${ext}`;
    const { error: ue } = await supabase.storage.from('uploads').upload(path, fileBuffer, { contentType: mimeType, upsert: true });
    if (ue) return { success: false, message: ue.message };
    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    await supabase.from("organisations").update({ logo_url: data.publicUrl }).eq("id", orgId);
    return { success: true, logoUrl: data.publicUrl };
  } catch (e) { return { success: false, message: e.message }; }
};

exports.getOrganisationLogo = async (orgId) => {
  const { data, error } = await supabase.from("organisations").select("logo_url").eq("id", orgId).single();
  return error ? { success: false, message: error.message } : { success: true, logoUrl: data?.logo_url };
};