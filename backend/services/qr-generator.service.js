/* ============================================================
   TRAPMAP – QR-CODE PDF GENERATOR SERVICE
   Generiert druckbare QR-Code PDFs
   ============================================================ */

const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { supabase } = require('../config/supabase');
const crypto = require('crypto');

// ============================================
// GENERATE CODES
// ============================================
exports.generateCodes = async (organisation_id, count, prefix = 'TM') => {
  const codes = [];

  for (let i = 0; i < count; i++) {
    // Unique Code generieren
    const uniquePart = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const code = `${prefix}-${uniquePart}`;

    // In DB speichern
    const { error } = await supabase.from('qr_codes').insert({
      id: code,
      organisation_id,
      assigned: false
    });

    if (!error) {
      codes.push(code);
    }
  }

  return codes;
};

// ============================================
// GENERATE SEQUENTIAL CODES
// ============================================
exports.generateSequentialCodes = async (organisation_id, startNumber, count, prefix = 'TM') => {
  const codes = [];

  for (let i = 0; i < count; i++) {
    const number = startNumber + i;
    const code = `${prefix}-${String(number).padStart(4, '0')}`;

    // Prüfe ob Code bereits existiert
    const { data: existing } = await supabase
      .from('qr_codes')
      .select('id')
      .eq('id', code)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.from('qr_codes').insert({
        id: code,
        organisation_id,
        assigned: false
      });

      if (!error) {
        codes.push(code);
      }
    }
  }

  return codes;
};

// ============================================
// GENERATE QR CODE IMAGE
// ============================================
exports.generateQRCodeImage = async (code, size = 200) => {
  return await QRCode.toDataURL(code, {
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'H' // High error correction for durability
  });
};

// ============================================
// GENERATE PDF WITH QR CODES
// ============================================
exports.generateQRCodePDF = async (codes, options = {}) => {
  const {
    codesPerRow = 4,
    codesPerPage = 20,
    codeSize = 100, // mm -> points
    showLabel = true,
    companyName = 'TrapMap',
    pageSize = 'A4'
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: pageSize,
        margin: 30
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width - 60; // margins
      const pageHeight = doc.page.height - 60;
      
      const cellWidth = pageWidth / codesPerRow;
      const cellHeight = (pageHeight - 40) / (codesPerPage / codesPerRow);

      let currentRow = 0;
      let currentCol = 0;
      let codeCount = 0;

      // Header auf erster Seite
      doc.fontSize(16).text(`${companyName} - QR-Codes`, 30, 30);
      doc.fontSize(10).text(`Generiert: ${new Date().toLocaleDateString('de-DE')}`, 30, 50);
      doc.moveDown(2);

      const startY = 80;

      for (const code of codes) {
        // Neue Seite wenn nötig
        if (codeCount > 0 && codeCount % codesPerPage === 0) {
          doc.addPage();
          currentRow = 0;
          currentCol = 0;
        }

        // Position berechnen
        const x = 30 + (currentCol * cellWidth);
        const y = startY + (currentRow * cellHeight);

        // QR-Code generieren
        const qrDataUrl = await QRCode.toDataURL(code, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'H'
        });

        // QR-Code zeichnen
        const qrSize = Math.min(cellWidth - 20, cellHeight - 30);
        const qrX = x + (cellWidth - qrSize) / 2;
        const qrY = y + 5;

        doc.image(qrDataUrl, qrX, qrY, {
          width: qrSize,
          height: qrSize
        });

        // Label zeichnen
        if (showLabel) {
          doc.fontSize(8)
             .text(code, x, qrY + qrSize + 5, {
               width: cellWidth,
               align: 'center'
             });
        }

        // Nächste Position
        currentCol++;
        if (currentCol >= codesPerRow) {
          currentCol = 0;
          currentRow++;
        }
        codeCount++;
      }

      // Footer
      const totalPages = Math.ceil(codes.length / codesPerPage);
      doc.fontSize(8).text(
        `Seite ${doc.bufferedPageRange().count} von ${totalPages} | ${codes.length} Codes`,
        30,
        doc.page.height - 30,
        { align: 'center', width: pageWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================
// GENERATE LABEL SHEET (Avery-compatible)
// ============================================
exports.generateLabelSheet = async (codes, labelFormat = 'avery-3651') => {
  // Avery Label Formate
  const formats = {
    'avery-3651': { // 52.5 x 29.7mm, 40 labels per sheet
      labelsPerRow: 4,
      labelsPerCol: 10,
      labelWidth: 149, // points
      labelHeight: 84,
      marginTop: 36,
      marginLeft: 22,
      gapX: 0,
      gapY: 0
    },
    'avery-3652': { // 70 x 36mm, 24 labels per sheet
      labelsPerRow: 3,
      labelsPerCol: 8,
      labelWidth: 198,
      labelHeight: 102,
      marginTop: 36,
      marginLeft: 22,
      gapX: 0,
      gapY: 0
    },
    'avery-l7163': { // 99.1 x 38.1mm, 14 labels per sheet
      labelsPerRow: 2,
      labelsPerCol: 7,
      labelWidth: 281,
      labelHeight: 108,
      marginTop: 36,
      marginLeft: 22,
      gapX: 10,
      gapY: 0
    }
  };

  const format = formats[labelFormat] || formats['avery-3651'];
  const labelsPerPage = format.labelsPerRow * format.labelsPerCol;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      let labelIndex = 0;

      for (const code of codes) {
        // Neue Seite wenn nötig
        if (labelIndex > 0 && labelIndex % labelsPerPage === 0) {
          doc.addPage();
        }

        const pageIndex = labelIndex % labelsPerPage;
        const row = Math.floor(pageIndex / format.labelsPerRow);
        const col = pageIndex % format.labelsPerRow;

        const x = format.marginLeft + col * (format.labelWidth + format.gapX);
        const y = format.marginTop + row * (format.labelHeight + format.gapY);

        // QR-Code generieren
        const qrSize = Math.min(format.labelWidth, format.labelHeight) - 20;
        const qrDataUrl = await QRCode.toDataURL(code, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'H'
        });

        // Zentriert auf Label
        const qrX = x + (format.labelWidth - qrSize) / 2;
        const qrY = y + 5;

        doc.image(qrDataUrl, qrX, qrY, {
          width: qrSize,
          height: qrSize
        });

        // Code-Text unter QR
        doc.fontSize(7)
           .text(code, x, qrY + qrSize + 2, {
             width: format.labelWidth,
             align: 'center'
           });

        labelIndex++;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================
// GET UNUSED CODES
// ============================================
exports.getUnusedCodes = async (organisation_id, limit = 100) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('organisation_id', organisation_id)
    .eq('assigned', false)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
};

// ============================================
// GET CODE STATISTICS
// ============================================
exports.getCodeStats = async (organisation_id) => {
  const { data: total } = await supabase
    .from('qr_codes')
    .select('id', { count: 'exact' })
    .eq('organisation_id', organisation_id);

  const { data: assigned } = await supabase
    .from('qr_codes')
    .select('id', { count: 'exact' })
    .eq('organisation_id', organisation_id)
    .eq('assigned', true);

  const { data: unassigned } = await supabase
    .from('qr_codes')
    .select('id', { count: 'exact' })
    .eq('organisation_id', organisation_id)
    .eq('assigned', false);

  return {
    total: total?.length || 0,
    assigned: assigned?.length || 0,
    unassigned: unassigned?.length || 0
  };
};