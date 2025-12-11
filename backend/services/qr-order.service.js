/* ============================================================
   TRAPMAP – QR-ORDER SERVICE
   Automatisierte QR-Code Bestellungen pro Organisation
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
  basePrice: 0.05,        // Basispreis pro Code
  bulkDiscount: {
    100: 0.04,            // Ab 100 Stück: 4 Cent
    500: 0.03,            // Ab 500 Stück: 3 Cent
    1000: 0.025           // Ab 1000 Stück: 2,5 Cent
  },
  shippingEmail: 0,       // E-Mail-Versand kostenlos
  shippingPost: 4.99      // Postversand (falls gewünscht)
};

// ============================================
// ORGANISATION EINSTELLUNGEN
// ============================================

/**
 * Holt oder erstellt QR-Präfix für Organisation
 */
exports.getOrganisationPrefix = async (organisationId) => {
  const { data, error } = await supabase
    .from('organisations')
    .select('qr_prefix, qr_next_number, name')
    .eq('id', organisationId)
    .single();

  if (error) throw new Error(error.message);

  // Falls kein Präfix gesetzt, generiere eines aus dem Namen
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

/**
 * Generiert Präfix aus Organisationsname
 */
function generatePrefixFromName(name) {
  // Nimm die ersten 2-3 Buchstaben der Wörter
  const words = name.replace(/[^a-zA-ZäöüÄÖÜ\s]/g, '').split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  
  // Erste Buchstaben der ersten 3 Wörter
  return words
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Setzt benutzerdefinierten Präfix
 */
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

/**
 * Berechnet Preis für eine Bestellung
 */
exports.calculatePrice = (quantity) => {
  let pricePerCode = PRICING.basePrice;

  // Mengenrabatt anwenden
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

/**
 * Erstellt eine neue QR-Code Bestellung
 */
exports.createOrder = async (organisationId, quantity, createdBy) => {
  // 1. Organisation und nächste Nummer holen
  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('qr_prefix, qr_next_number, name, contact_email')
    .eq('id', organisationId)
    .single();

  if (orgError) throw new Error('Organisation nicht gefunden');

  const prefix = org.qr_prefix || generatePrefixFromName(org.name);
  const startNumber = org.qr_next_number || 1;
  const endNumber = startNumber + quantity - 1;

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
// CODES GENERIEREN
// ============================================

/**
 * Generiert QR-Codes für eine Bestellung
 */
exports.generateCodesForOrder = async (orderId) => {
  // 1. Bestellung laden
  const { data: order, error: orderError } = await supabase
    .from('qr_orders')
    .select('*, organisations(name, qr_prefix)')
    .eq('id', orderId)
    .single();

  if (orderError) throw new Error('Bestellung nicht gefunden');
  if (order.status !== 'pending') throw new Error('Bestellung wurde bereits verarbeitet');

  const codes = [];

  // 2. Codes generieren und in DB speichern
  for (let i = order.start_number; i <= order.end_number; i++) {
    const codeId = `${order.prefix}-${String(i).padStart(4, '0')}`;
    const url = `${SCAN_BASE_URL}/${codeId}`;

    const { error } = await supabase
      .from('qr_codes')
      .insert({
        id: codeId,
        organisation_id: order.organisation_id,
        sequence_number: i,
        order_id: orderId,
        assigned: false
      });

    if (!error) {
      codes.push({ id: codeId, url, number: i });
    }
  }

  // 3. Status aktualisieren
  await supabase
    .from('qr_orders')
    .update({ status: 'generated' })
    .eq('id', orderId);

  // 4. Organisation Statistik aktualisieren
  await supabase
    .from('organisations')
    .update({ 
      qr_codes_ordered: supabase.raw(`qr_codes_ordered + ${codes.length}`)
    })
    .eq('id', order.organisation_id);

  return codes;
};

// ============================================
// PDF GENERIEREN
// ============================================

/**
 * Generiert PDF mit QR-Codes
 */
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

  if (!codes || codes.length === 0) {
    throw new Error('Keine Codes für diese Bestellung gefunden');
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
        // Neue Seite wenn nötig
        if (codesOnPage > 0 && codesOnPage % codesPerPage === 0) {
          doc.addPage();
          currentRow = 0;
          currentCol = 0;
        }

        const x = 30 + (currentCol * cellWidth);
        const y = startY + (currentRow * cellHeight);

        // QR-Code generieren
        const url = `${SCAN_BASE_URL}/${code.id}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'H'
        });

        // QR-Code zeichnen
        const qrX = x + (cellWidth - codeSize) / 2;
        doc.image(qrDataUrl, qrX, y, { width: codeSize, height: codeSize });

        // Label
        doc.fontSize(9).text(code.id, x, y + codeSize + 5, {
          width: cellWidth,
          align: 'center'
        });

        // Nächste Position
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

      // Kostenübersicht
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

/**
 * Versendet QR-Codes per E-Mail
 */
exports.sendOrderByEmail = async (orderId, recipientEmail = null) => {
  // 1. Bestellung laden
  const { data: order } = await supabase
    .from('qr_orders')
    .select('*, organisations(name, contact_email)')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Bestellung nicht gefunden');

  // E-Mail-Adresse bestimmen
  const email = recipientEmail || order.organisations.contact_email;
  if (!email) throw new Error('Keine E-Mail-Adresse vorhanden');

  // 2. PDF generieren
  const pdfBuffer = await exports.generateOrderPDF(orderId);

  // 3. E-Mail senden
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

  // 4. Bestellung als versendet markieren
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

/**
 * Kompletter Workflow: Erstellen → Generieren → Versenden
 */
exports.processCompleteOrder = async (organisationId, quantity, createdBy, recipientEmail = null) => {
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

/**
 * Statistiken für eine Organisation
 */
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

/**
 * Alle Organisationen mit QR-Statistiken (für Super-Admin)
 */
exports.getAllOrganisationsStats = async () => {
  const { data: organisations } = await supabase
    .from('organisations')
    .select(`
      id, name, contact_email,
      qr_prefix, qr_next_number, qr_codes_ordered
    `)
    .order('name');

  // Für jede Organisation die Anzahl verwendeter Codes holen
  const stats = await Promise.all(organisations.map(async (org) => {
    const { count: usedCodes } = await supabase
      .from('qr_codes')
      .select('id', { count: 'exact' })
      .eq('organisation_id', org.id)
      .eq('assigned', true);

    return {
      ...org,
      usedCodes: usedCodes || 0,
      availableCodes: (org.qr_codes_ordered || 0) - (usedCodes || 0)
    };
  }));

  return stats;
};