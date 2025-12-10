// ============================================
// REPORTS SERVICE - KOMPLETT
// Audit Reports + Gefahrenanalyse + Logo
// ============================================

const { supabase } = require("../config/supabase");

let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (e) {
  console.warn("⚠️ pdfkit nicht installiert");
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString("de-DE") : "";
const formatDateTime = (d) => d ? new Date(d).toLocaleString("de-DE") : "";
const statusText = { green: "OK", yellow: "Auffällig", orange: "Erhöht", red: "Befall" };

// ============================================
// GET OBJECTS
// ============================================
exports.getObjects = async (orgId) => {
  const { data, error } = await supabase
    .from("objects").select("*")
    .eq("organisation_id", orgId).order("name", { ascending: true });
  return error ? { success: false, message: error.message } : { success: true, data: data || [] };
};

// ============================================
// GET ORGANISATION
// ============================================
exports.getOrganisation = async (orgId) => {
  const { data, error } = await supabase
    .from("organisations").select("*")
    .eq("id", orgId).single();
  return error ? { success: false, message: error.message } : { success: true, data };
};

// ============================================
// GET REPORT DATA (für Audit)
// ============================================
exports.getReportData = async (orgId, objectId, startDate, endDate) => {
  try {
    const { data: object } = await supabase
      .from("objects").select("*")
      .eq("id", objectId).eq("organisation_id", orgId).single();
    if (!object) return { success: false, message: "Objekt nicht gefunden" };

    const { data: organisation } = await supabase
      .from("organisations").select("*")
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

// ============================================
// LOGO LADEN
// ============================================
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
// AUDIT PDF GENERIEREN
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

    const addPageHeader = () => {
      doc.fontSize(8).font("Helvetica").fillColor("#999999");
      doc.text(`${orgName} | ${object.name} | Seite ${pageNum}`, 50, 30, { align: "right", width: W });
      doc.fillColor("#000000");
      doc.moveTo(50, 45).lineTo(545, 45).stroke("#eeeeee");
    };

    const newPage = () => {
      doc.addPage();
      pageNum++;
      addPageHeader();
      return 55;
    };

    if (logoBuffer) {
      try { doc.image(logoBuffer, doc.page.width - 130, 30, { fit: [80, 40] }); } catch {}
    }

    doc.fontSize(24).font("Helvetica-Bold").fillColor("#000000").text("AUDIT-REPORT", 50, 50);
    doc.fontSize(11).font("Helvetica").text("Schädlingsbekämpfung");
    doc.moveDown(1.5);

    const iy = doc.y;
    doc.rect(50, iy, W, 70).stroke("#cccccc");
    doc.fontSize(14).font("Helvetica-Bold").text(object.name, 60, iy + 10);
    doc.fontSize(10).font("Helvetica")
      .text(`${object.address || ""}, ${object.zip || ""} ${object.city || ""}`, 60, iy + 28)
      .text(`Berichtszeitraum: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, 60, iy + 42)
      .text(`Erstellt am: ${formatDateTime(new Date())}`, 60, iy + 56);
    doc.y = iy + 85;

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

    doc.end();
  });
};

// ============================================
// GEFAHRENANALYSE PDF GENERIEREN
// Mit Dienstleister, Auftraggeber, Objekt
// ============================================
exports.generateGefahrenanalyse = async (data, organisation) => {
  if (!PDFDocument) throw new Error("pdfkit nicht installiert");

  const logoBuffer = organisation?.logo_url ? await loadLogo(organisation.logo_url) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: "A4", 
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 80;
    const LEFT = 40;
    const COL2 = 220;
    const COL3 = 400;

    // Checkbox Helper
    const checkbox = (x, y, checked) => {
      doc.rect(x, y, 10, 10).stroke("#000000");
      if (checked) {
        doc.moveTo(x + 2, y + 5).lineTo(x + 4, y + 8).lineTo(x + 8, y + 2).stroke("#000000");
      }
    };

    // ============================================
    // HEADER
    // ============================================
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Objektbezogene Gefahrenanalyse", LEFT, 40);
    doc.fontSize(10).font("Helvetica");
    doc.text("zur Bewertung der Notwendigkeit einer", LEFT, 58);
    doc.text("befallsunabhängigen Dauerbeköderung gegen Schadnager", LEFT, 70);

    // Logo oben rechts
    if (logoBuffer) {
      try { doc.image(logoBuffer, doc.page.width - 120, 35, { fit: [70, 35] }); } catch {}
    }

    // Hinweistext
    doc.fontSize(6).font("Helvetica").fillColor("#333333");
    doc.text('Aufgrund der „Allgemeinen Kriterien einer guten fachlichen Anwendung von Fraßködern bei der Nagetierbekämpfung mit Antikoagulanzien durch sachkundige Verwender und berufsmäßige Verwender mit Sachkunde" erfolgte die Bewertung zur Notwendigkeit einer befallsunabhängigen Dauerbeköderung gegen Schadnager.', LEFT, 88, { width: W });

    let y = 115;

    // ============================================
    // DREI SPALTEN: Dienstleister, Auftraggeber, Objekt
    // ============================================
    const fieldHeight = 14;
    const labelWidth = 55;
    const valueWidth = 100;

    const drawSection = (title, data, x, startY) => {
      doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold").text(title, x, startY);
      let yPos = startY + 14;
      doc.fontSize(7).font("Helvetica");
      
      const fields = [
        { label: "Firma", key: "firma" },
        { label: "Straße", key: "strasse" },
        { label: "PLZ/Ort", key: "plzOrt" },
        { label: "Verantw.", key: "verantwortlicher" },
        { label: "Telefon", key: "telefon" }
      ];

      fields.forEach(f => {
        doc.fillColor("#000000").text(f.label, x, yPos + 2);
        doc.rect(x + labelWidth, yPos, valueWidth, fieldHeight).stroke("#999999");
        const val = data?.[f.key] || "";
        if (val) doc.text(val.substring(0, 18), x + labelWidth + 2, yPos + 3);
        yPos += 16;
      });

      return yPos;
    };

    const y1 = drawSection("Dienstleister:", data.dienstleister, LEFT, y);
    drawSection("Auftraggeber:", data.auftraggeber, COL2, y);
    drawSection("Objekt:", data.objekt, COL3, y);

    y = y1 + 10;

    // ============================================
    // DURCHFÜHRUNG
    // ============================================
    doc.fontSize(9).font("Helvetica-Bold").text("Durchführung:", LEFT, y);
    y += 14;
    
    doc.fontSize(8).font("Helvetica");
    doc.text("Am:", LEFT, y + 2);
    doc.rect(LEFT + 20, y, 80, fieldHeight).stroke("#999999");
    doc.text(data.durchfuehrung?.datum || formatDate(new Date()), LEFT + 23, y + 3);
    
    doc.text("Durch:", LEFT + 120, y + 2);
    doc.rect(LEFT + 150, y, 120, fieldHeight).stroke("#999999");
    doc.text(data.durchfuehrung?.durch || "", LEFT + 153, y + 3);

    y += 25;

    // ============================================
    // DOKUMENTATION
    // ============================================
    doc.fontSize(9).font("Helvetica-Bold").text("Aktuelle Dokumentation (Zutreffendes ankreuzen):", LEFT, y);
    y += 14;
    doc.fontSize(8).font("Helvetica");
    
    checkbox(LEFT, y, data.dokumentation?.apcIntegral);
    doc.text("APC Integral", LEFT + 14, y + 1);
    
    checkbox(LEFT + 80, y, data.dokumentation?.apcDocuWeb);
    doc.text("APC DocuWeb", LEFT + 94, y + 1);
    
    checkbox(LEFT + 170, y, data.dokumentation?.trapmap !== false);
    doc.text("TrapMap", LEFT + 184, y + 1);

    doc.text("Behandlungen jährlich:", LEFT + 260, y + 1);
    doc.rect(LEFT + 355, y - 1, 35, fieldHeight).stroke("#999999");
    doc.text(data.behandlungenJaehrlich?.toString() || "", LEFT + 358, y + 2);
    
    doc.text("Inspektionsintervall", LEFT + 400, y + 1);

    y += 25;

    // ============================================
    // VORAUSSETZUNGEN HEADER
    // ============================================
    doc.rect(LEFT, y, W, 16).fill("#e8e8e8");
    doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
    doc.text("Voraussetzungen für eine befallsunabhängige Dauerbeköderung", LEFT + 5, y + 4);
    doc.text("Gegeben:", W - 60, y + 4);
    doc.text("JA", W - 15, y + 4);
    doc.text("NEIN", W + 15, y + 4);

    y += 20;
    doc.fontSize(6).font("Helvetica").fillColor("#444444");
    doc.text("Die Voraussetzung für eine befallsunabhängige Dauerbeköderung durch Rodentizide mit Antikoagulanzien der 2. Generation ist nur gegeben, wenn alle drei der nachfolgenden Kriterien mit JA zu beantworten sind.", LEFT, y, { width: W - 50 });
    
    doc.fillColor("#000000");
    y += 18;

    // ============================================
    // KRITERIEN
    // ============================================
    const kriterien = [
      "1. Ausschließlicher Einsatz dauerhaft kontrollierter Köderstellen an bevorzugten Eintritts- und Einniststellen von Schadnagern in und am Gebäude. Verwendung zugriffgeschützter Köderboxen.",
      "2. Erhöhte Befallsgefahr durch Nagetiere, die eine besondere Gefahr für Gesundheit oder Sicherheit von Mensch und Tier darstellt.",
      "3. Keine Möglichkeit, die Befallsgefahr durch verhältnismäßige Maßnahmen (z.B. organisatorische oder bauliche Maßnahmen oder Einsatz toxinfreier Alternativen) zu verhindern."
    ];

    doc.fontSize(7).font("Helvetica");
    kriterien.forEach((text, i) => {
      const textHeight = doc.heightOfString(text, { width: W - 70 });
      doc.text(text, LEFT, y, { width: W - 70 });
      
      checkbox(W - 10, y, data.kriterien?.[i]?.ja);
      checkbox(W + 20, y, data.kriterien?.[i]?.nein);
      
      y += Math.max(textHeight, 12) + 6;
    });

    y += 5;

    // ============================================
    // EMPFEHLUNG HEADER
    // ============================================
    doc.rect(LEFT, y, W, 16).fill("#e8e8e8");
    doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
    doc.text("Empfehlung auf Grund der vorliegenden Gefahrenanalyse:", LEFT + 5, y + 4);
    doc.fontSize(7).font("Helvetica");
    doc.text("Zutreffendes ankreuzen", W - 50, y + 5);

    y += 22;
    doc.fontSize(7).font("Helvetica");

    // Empfehlung 1
    checkbox(LEFT, y, data.empfehlung === 1);
    const emp1 = "Wir empfehlen die Beibehaltung des bisherigen Inspektionsintervalls von weniger als 12 Behandlungen jährlich. Bei Eintreten eines Befalls durch Nagetiere empfehlen wir die temporäre Umstellung von NeoTox auf Tox unter Berücksichtigung der Allgemeinen Kriterien einer guten fachlichen Anwendung von Fraßködern bei der Nagetierbekämpfung. Entsprechend erforderliche zusätzliche Behandlungen werden gesondert berechnet.";
    doc.text(emp1, LEFT + 14, y, { width: W - 20 });
    
    y += doc.heightOfString(emp1, { width: W - 20 }) + 8;

    // Empfehlung 2
    checkbox(LEFT, y, data.empfehlung === 2);
    const emp2 = "Wir empfehlen die befallsunabhängige Beköderung mit Rodentiziden der beiliegenden Einzelzulassung der Systeme zur Nagetierbekämpfung mit Benennung der Kontrollpunkte bzw. Objektbereiche. Das Intervall zur Systembetreuung bei befallsunabhängiger Dauerbeköderung muss im Zeitraum von 1-4 Wochen liegen.";
    doc.text(emp2, LEFT + 14, y, { width: W - 20 });

    y += doc.heightOfString(emp2, { width: W - 20 }) + 20;

    // ============================================
    // UNTERSCHRIFTEN
    // ============================================
    doc.fontSize(8).font("Helvetica");
    doc.text("Unterschrift Kunde:", LEFT, y);
    doc.moveTo(LEFT + 80, y + 12).lineTo(LEFT + 200, y + 12).stroke("#000000");
    
    doc.text("Unterschrift Firma:", LEFT + 280, y);
    doc.moveTo(LEFT + 360, y + 12).lineTo(LEFT + 480, y + 12).stroke("#000000");

    y += 35;

    // Footer
    doc.fontSize(7).fillColor("#888888");
    doc.text("Erstellt mit TrapMap - Professionelles Schädlingsmanagement", LEFT, y, { align: "center", width: W });

    doc.end();
  });
};

// ============================================
// LOGO UPLOAD & GET
// ============================================
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