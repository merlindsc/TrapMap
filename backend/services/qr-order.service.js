/* ============================================================
   TRAPMAP – QR-ORDER SERVICE (FIXED)
   Automatisierte QR-Code Bestellungen pro Organisation
   FIX: Besseres Error-Handling, keine Unterbrechung bei Einzelfehlern
   ============================================================ */

const { supabase } = require('../config/supabase');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { Resend } = require('resend');

// Resend für E-Mail-Versand
const resend = new Resend(process.env.RESEND_API_KEY);

// Basis-URL für Scans
const SCAN_BASE_URL = process.env.SCAN_BASE_URL || 'https://trap-map.de/s';

// Preiskonfiguration
const PRICING = {
  basePrice: 0.05,
  bulkDiscount: {
    100: 0.04,
    500: 0.03,
    1000: 0.025
  },
  shippingEmail: 0,
  shippingPost: 4.99
};

// ============================================
// ORGANISATION EINSTELLUNGEN
// ============================================

exports.getOrganisationPrefix = async (organisationId) => {
  const { data, error } = await supabase
    .from('organisations')
    .select('qr_prefix, qr_next_number, name')
    .eq('id', organisationId)
    .single();

  if (error) throw new Error(error.message);

  if (!data.qr_prefix) {
    const prefix = generatePrefixFromName(data.name);
    await supabase
      .from('organisations')
      .update({ qr_prefix: prefix })
      .eq('id', organisationId);
    data.qr_prefix = prefix;
  }

  return data;
};

function generatePrefixFromName(name) {
  const words = name.replace(/[^a-zA-ZäöüÄÖÜ\s]/g, '').split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  
  return words
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

exports.setOrganisationPrefix = async (organisationId, prefix) => {
  const cleanPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
  
  const { error } = await supabase
    .from('organisations')
    .update({ qr_prefix: cleanPrefix })
    .eq('id', organisationId);

  if (error) throw new Error(error.message);
  return cleanPrefix;
};

// ============================================
// PREIS BERECHNUNG
// ============================================

exports.calculatePrice = (quantity) => {
  let pricePerCode = PRICING.basePrice;

  for (const [threshold, price] of Object.entries(PRICING.bulkDiscount).sort((a, b) => b[0] - a[0])) {
    if (quantity >= parseInt(threshold)) {
      pricePerCode = price;
      break;
    }
  }

  const subtotal = quantity * pricePerCode;
  const shipping = PRICING.shippingEmail;
  const total = subtotal + shipping;

  return {
    quantity,
    pricePerCode,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping,
    total: Math.round(total * 100) / 100,
    discount: quantity >= 100 ? `${Math.round((1 - pricePerCode / PRICING.basePrice) * 100)}%` : null
  };
};

// ============================================
// BESTELLUNG ERSTELLEN
// ============================================

exports.createOrder = async (organisationId, quantity, createdBy) => {
  // 1. Organisation und nächste Nummer holen
  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('qr_prefix, qr_next_number, name, contact_email')
    .eq('id', organisationId)
    .single();

  if (orgError) throw new Error('Organisation nicht gefunden');

  const prefix = org.qr_prefix || generatePrefixFromName(org.name);
  
  // ============================================
  // FIX: Höchste existierende Nummer finden!
  // ============================================
  let startNumber = org.qr_next_number || 1;
  
  // Prüfe ob es schon Codes mit diesem Prefix gibt
  const { data: existingCodes } = await supabase
    .from('qr_codes')
    .select('sequence_number')
    .eq('organisation_id', organisationId)
    .order('sequence_number', { ascending: false })
    .limit(1);

  if (existingCodes && existingCodes.length > 0) {
    const highestExisting = existingCodes[0].sequence_number || 0;
    // Starte nach der höchsten existierenden Nummer
    if (highestExisting >= startNumber) {
      startNumber = highestExisting + 1;
      console.log(`⚠️ Korrigiere startNumber: ${org.qr_next_number} → ${startNumber}`);
    }
  }

  const endNumber = startNumber + quantity - 1;

  console.log(`📦 Creating order: ${prefix}-${String(startNumber).padStart(4, '0')} bis ${prefix}-${String(endNumber).padStart(4, '0')}`);

  // 2. Preis berechnen
  const pricing = exports.calculatePrice(quantity);

  // 3. Bestellung in DB anlegen
  const { data: order, error: orderError } = await supabase
    .from('qr_orders')
    .insert({
      organisation_id: organisationId,
      quantity,
      start_number: startNumber,
      end_number: endNumber,
      prefix,
      price_per_code: pricing.pricePerCode,
      total_price: pricing.total,
      status: 'pending',
      created_by: createdBy
    })
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  // 4. Nächste Nummer in Organisation aktualisieren
  await supabase
    .from('organisations')
    .update({ 
      qr_next_number: endNumber + 1,
      qr_prefix: prefix
    })
    .eq('id', organisationId);

  return {
    order,
    pricing,
    organisation: {
      name: org.name,
      email: org.contact_email,
      prefix
    }
  };
};

// ============================================
// CODES GENERIEREN (FIXED)
// FIX: Besseres Error-Handling, Progress-Logging
// ============================================

exports.generateCodesForOrder = async (orderId) => {
  // 1. Bestellung laden
  const { data: order, error: orderError } = await supabase
    .from('qr_orders')
    .select('*, organisations(name, qr_prefix)')
    .eq('id', orderId)
    .single();

  if (orderError) throw new Error('Bestellung nicht gefunden');
  if (order.status !== 'pending') throw new Error('Bestellung wurde bereits verarbeitet');

  const totalToGenerate = order.end_number - order.start_number + 1;
  console.log(`🔄 Generiere ${totalToGenerate} Codes + Boxen für Order ${orderId}`);
  console.log(`   Range: ${order.start_number} bis ${order.end_number}`);

  const codes = [];
  const errors = [];
  let progressLog = 0;

  // 2. Codes UND Boxen generieren
  for (let i = order.start_number; i <= order.end_number; i++) {
    const codeId = `${order.prefix}-${String(i).padStart(4, '0')}`;
    const url = `${SCAN_BASE_URL}/${codeId}`;

    try {
      // 2a. Prüfen ob Code bereits existiert
      const { data: existingCode } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('id', codeId)
        .maybeSingle();

      if (existingCode) {
        console.log(`⏭️ Code ${codeId} existiert bereits, überspringe...`);
        // Trotzdem als erfolgreich zählen
        const { data: existingBox } = await supabase
          .from('boxes')
          .select('id')
          .eq('qr_code', codeId)
          .maybeSingle();
        
        if (existingBox) {
          codes.push({ id: codeId, url, number: i, box_id: existingBox.id, skipped: true });
        }
        continue;
      }

      // 2b. QR-Code erstellen
      const { error: codeError } = await supabase
        .from('qr_codes')
        .insert({
          id: codeId,
          organisation_id: order.organisation_id,
          sequence_number: i,
          order_id: orderId,
          assigned: false
        });

      if (codeError) {
        console.error(`❌ Code ${codeId} fehlgeschlagen:`, codeError.message);
        errors.push({ code: codeId, error: codeError.message, step: 'qr_code' });
        continue;
      }

      // 2c. Box erstellen (im Pool) und mit QR-Code verknüpfen
      const { data: box, error: boxError } = await supabase
        .from('boxes')
        .insert({
          organisation_id: order.organisation_id,
          qr_code: codeId,
          number: i,
          status: 'active',
          position_type: null,
          current_status: null,
          active: true,
          object_id: null
        })
        .select()
        .single();

      if (boxError) {
        console.error(`❌ Box für ${codeId} fehlgeschlagen:`, boxError.message);
        // Rollback: QR-Code wieder löschen
        await supabase.from('qr_codes').delete().eq('id', codeId);
        errors.push({ code: codeId, error: boxError.message, step: 'box' });
        continue;
      }

      // 2d. QR-Code mit Box-ID aktualisieren
      const { error: linkError } = await supabase
        .from('qr_codes')
        .update({ box_id: box.id, assigned: true })
        .eq('id', codeId);

      if (linkError) {
        console.warn(`⚠️ Link-Update für ${codeId} fehlgeschlagen:`, linkError.message);
        // Nicht kritisch - weiter machen
      }

      codes.push({ id: codeId, url, number: i, box_id: box.id });

      // Progress-Logging alle 10 Codes
      if (codes.length % 10 === 0 || codes.length === totalToGenerate) {
        console.log(`   📊 Progress: ${codes.length}/${totalToGenerate} (${Math.round(codes.length/totalToGenerate*100)}%)`);
      }

    } catch (err) {
      console.error(`❌ Unerwarteter Fehler bei ${codeId}:`, err.message);
      errors.push({ code: codeId, error: err.message, step: 'unknown' });
      // NICHT abbrechen - weiter mit nächstem Code!
    }
  }

  console.log(`✅ Fertig: ${codes.length} Codes + Boxen erstellt, ${errors.length} Fehler`);

  // Wenn KEINE Codes erstellt wurden, Fehler werfen
  if (codes.length === 0) {
    throw new Error(`Keine Codes erstellt! ${errors.length} Fehler. Erster Fehler: ${errors[0]?.error || 'unbekannt'}`);
  }

  // Bei teilweisem Erfolg: Warnung loggen
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} Codes konnten nicht erstellt werden:`);
    errors.slice(0, 5).forEach(e => console.warn(`   - ${e.code}: ${e.error} (${e.step})`));
    if (errors.length > 5) console.warn(`   ... und ${errors.length - 5} weitere`);
  }

  // 3. Status aktualisieren
  const newStatus = errors.length === 0 ? 'generated' : 'generated_partial';
  await supabase
    .from('qr_orders')
    .update({ 
      status: newStatus,
      codes_generated: codes.length,
      codes_failed: errors.length
    })
    .eq('id', orderId);

  // 4. Organisation Statistik aktualisieren
  const { data: orgData } = await supabase
    .from('organisations')
    .select('qr_codes_ordered')
    .eq('id', order.organisation_id)
    .single();

  const currentOrdered = orgData?.qr_codes_ordered || 0;
  
  await supabase
    .from('organisations')
    .update({ 
      qr_codes_ordered: currentOrdered + codes.length
    })
    .eq('id', order.organisation_id);

  return codes;
};

// ============================================
// PDF GENERIEREN
// ============================================

exports.generateOrderPDF = async (orderId) => {
  // 1. Bestellung und Codes laden
  const { data: order } = await supabase
    .from('qr_orders')
    .select('*, organisations(name)')
    .eq('id', orderId)
    .single();

  const { data: codes } = await supabase
    .from('qr_codes')
    .select('id, sequence_number')
    .eq('order_id', orderId)
    .order('sequence_number', { ascending: true });

  console.log(`📄 PDF für Order ${orderId}: ${codes?.length || 0} Codes gefunden`);

  if (!codes || codes.length === 0) {
    throw new Error(`Keine Codes für diese Bestellung gefunden (order_id: ${orderId})`);
  }

  // 2. PDF erstellen
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('TrapMap QR-Codes', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Organisation: ${order.organisations.name}`, { align: 'center' });
      doc.fontSize(10).text(`Bestellung vom ${new Date(order.created_at).toLocaleDateString('de-DE')}`, { align: 'center' });
      doc.text(`${codes.length} Codes: ${order.prefix}-${String(order.start_number).padStart(4, '0')} bis ${order.prefix}-${String(order.end_number).padStart(4, '0')}`, { align: 'center' });
      doc.moveDown(2);

      // Grid-Einstellungen
      const codesPerRow = 4;
      const codeSize = 100;
      const cellWidth = (doc.page.width - 60) / codesPerRow;
      const cellHeight = 140;
      const startY = doc.y;

      let currentRow = 0;
      let currentCol = 0;
      let codesOnPage = 0;
      const codesPerPage = 20;

      for (const code of codes) {
        if (codesOnPage > 0 && codesOnPage % codesPerPage === 0) {
          doc.addPage();
          currentRow = 0;
          currentCol = 0;
        }

        const x = 30 + (currentCol * cellWidth);
        const y = startY + (currentRow * cellHeight);

        const url = `${SCAN_BASE_URL}/${code.id}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'H'
        });

        const qrX = x + (cellWidth - codeSize) / 2;
        doc.image(qrDataUrl, qrX, y, { width: codeSize, height: codeSize });

        doc.fontSize(9).text(code.id, x, y + codeSize + 5, {
          width: cellWidth,
          align: 'center'
        });

        currentCol++;
        if (currentCol >= codesPerRow) {
          currentCol = 0;
          currentRow++;
        }
        codesOnPage++;
      }

      // Letzte Seite: Anleitung
      doc.addPage();
      doc.fontSize(16).text('Anleitung', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text('So verwenden Sie die QR-Codes:', { continued: false });
      doc.moveDown(0.5);
      doc.text('1. Drucken Sie diese Seiten auf Etikettenpapier oder normalem Papier aus.');
      doc.text('2. Schneiden Sie die QR-Codes aus oder verwenden Sie einen Etikettendrucker.');
      doc.text('3. Kleben Sie einen Code auf jede Monitoring-Box.');
      doc.text('4. Beim ersten Scan wird die Box automatisch eingerichtet.');
      doc.text('5. Bei jedem weiteren Scan öffnet sich direkt die Kontrolle.');
      doc.moveDown();
      doc.text('Wichtig: Jeder Code kann nur EINER Box zugewiesen werden!', { bold: true });
      doc.moveDown(2);

      doc.fontSize(14).text('Kostenübersicht', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Anzahl Codes: ${order.quantity}`);
      doc.text(`Preis pro Code: ${order.price_per_code.toFixed(4)} €`);
      doc.text(`Gesamtpreis: ${order.total_price.toFixed(2)} €`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================
// E-MAIL VERSAND
// ============================================

exports.sendOrderByEmail = async (orderId, recipientEmail = null) => {
  const { data: order } = await supabase
    .from('qr_orders')
    .select('*, organisations(name, contact_email)')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Bestellung nicht gefunden');

  const email = recipientEmail || order.organisations.contact_email;
  if (!email) throw new Error('Keine E-Mail-Adresse vorhanden');

  console.log(`📧 Sende Email an ${email} für Order ${orderId}`);

  const pdfBuffer = await exports.generateOrderPDF(orderId);

  const { data, error } = await resend.emails.send({
    from: 'TrapMap <noreply@trap-map.de>',
    to: email,
    subject: `Ihre TrapMap QR-Codes sind bereit! (${order.quantity} Codes)`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .highlight { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .price-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .price-table td { padding: 8px; border-bottom: 1px solid #ddd; }
          .price-table .total { font-weight: bold; background: #f0f0f0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏷️ Ihre QR-Codes sind fertig!</h1>
          </div>
          <div class="content">
            <p>Hallo ${order.organisations.name},</p>
            
            <p>Ihre QR-Code Bestellung wurde erfolgreich erstellt und ist als PDF-Anhang beigefügt.</p>
            
            <div class="highlight">
              <strong>Bestelldetails:</strong><br>
              📦 Anzahl: <strong>${order.quantity} QR-Codes</strong><br>
              🔢 Nummern: <strong>${order.prefix}-${String(order.start_number).padStart(4, '0')}</strong> bis <strong>${order.prefix}-${String(order.end_number).padStart(4, '0')}</strong>
            </div>
            
            <table class="price-table">
              <tr>
                <td>Anzahl Codes</td>
                <td align="right">${order.quantity}</td>
              </tr>
              <tr>
                <td>Preis pro Code</td>
                <td align="right">${order.price_per_code.toFixed(4)} €</td>
              </tr>
              <tr class="total">
                <td>Gesamtpreis</td>
                <td align="right">${order.total_price.toFixed(2)} €</td>
              </tr>
            </table>
            
            <h3>📋 So geht's weiter:</h3>
            <ol>
              <li>Öffnen Sie die angehängte PDF-Datei</li>
              <li>Drucken Sie die QR-Codes auf Etikettenpapier</li>
              <li>Kleben Sie einen Code auf jede Monitoring-Box</li>
              <li>Beim Scannen wird die Box automatisch in TrapMap angelegt</li>
            </ol>
            
            <p>
              <a href="https://trap-map.de/dashboard" class="button">
                Zu TrapMap →
              </a>
            </p>
            
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            
            <p>Mit freundlichen Grüßen,<br>Ihr TrapMap Team</p>
          </div>
          <div class="footer">
            <p>TrapMap - Professionelles Schädlingsmonitoring<br>
            <a href="https://trap-map.de">trap-map.de</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `TrapMap-QR-Codes-${order.prefix}-${order.start_number}-${order.end_number}.pdf`,
        content: pdfBuffer.toString('base64')
      }
    ]
  });

  if (error) throw new Error(error.message);

  await supabase
    .from('qr_orders')
    .update({ 
      status: 'sent',
      sent_to_email: email,
      sent_at: new Date().toISOString()
    })
    .eq('id', orderId);

  return { success: true, email, messageId: data?.id };
};

// ============================================
// KOMPLETTER WORKFLOW
// ============================================

exports.processCompleteOrder = async (organisationId, quantity, createdBy, recipientEmail = null) => {
  console.log(`🚀 processCompleteOrder: org=${organisationId}, qty=${quantity}, email=${recipientEmail}`);

  // 1. Bestellung erstellen
  const { order, pricing, organisation } = await exports.createOrder(organisationId, quantity, createdBy);

  // 2. Codes generieren
  const codes = await exports.generateCodesForOrder(order.id);

  // 3. Per E-Mail versenden
  const emailResult = await exports.sendOrderByEmail(order.id, recipientEmail || organisation.email);

  return {
    success: true,
    order: {
      id: order.id,
      quantity: order.quantity,
      codes: `${order.prefix}-${String(order.start_number).padStart(4, '0')} bis ${order.prefix}-${String(order.end_number).padStart(4, '0')}`,
      price: pricing.total
    },
    email: emailResult.email,
    generatedCodes: codes.length
  };
};

// ============================================
// STATISTIKEN
// ============================================

exports.getOrganisationStats = async (organisationId) => {
  const { data: org } = await supabase
    .from('organisations')
    .select('qr_prefix, qr_next_number, qr_codes_ordered, qr_codes_used')
    .eq('id', organisationId)
    .single();

  const { data: orders } = await supabase
    .from('qr_orders')
    .select('id, quantity, total_price, status, created_at')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false });

  const { count: totalCodes } = await supabase
    .from('qr_codes')
    .select('id', { count: 'exact' })
    .eq('organisation_id', organisationId);

  const { count: usedCodes } = await supabase
    .from('qr_codes')
    .select('id', { count: 'exact' })
    .eq('organisation_id', organisationId)
    .eq('assigned', true);

  return {
    prefix: org.qr_prefix,
    nextNumber: org.qr_next_number,
    totalCodes: totalCodes || 0,
    usedCodes: usedCodes || 0,
    availableCodes: (totalCodes || 0) - (usedCodes || 0),
    orders: orders || [],
    totalSpent: orders?.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0) || 0
  };
};

exports.getAllOrganisationsStats = async () => {
  const { data: organisations, error } = await supabase
    .from('organisations')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching organisations:', error);
    return [];
  }

  if (!organisations || organisations.length === 0) {
    return [];
  }

  const stats = await Promise.all(organisations.map(async (org) => {
    let usedCodes = 0;
    try {
      const { count } = await supabase
        .from('qr_codes')
        .select('id', { count: 'exact' })
        .eq('organisation_id', org.id)
        .eq('assigned', true);
      usedCodes = count || 0;
    } catch (e) {}

    return {
      id: org.id,
      name: org.name,
      contact_email: org.contact_email || org.email || null,
      qr_prefix: org.qr_prefix || null,
      qr_next_number: org.qr_next_number || 1,
      qr_codes_ordered: org.qr_codes_ordered || 0,
      usedCodes: usedCodes,
      availableCodes: (org.qr_codes_ordered || 0) - usedCodes
    };
  }));

  return stats;
};