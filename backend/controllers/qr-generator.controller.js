/* ============================================================
   TRAPMAP – QR-CODE GENERATOR CONTROLLER
   Endpoints für QR-Code Generierung und PDF-Downloads
   ============================================================ */

const qrGeneratorService = require('../services/qr-generator.service');

// ============================================
// GENERATE RANDOM CODES
// ============================================
exports.generateCodes = async (req, res) => {
  try {
    const { count, prefix } = req.body;
    const organisation_id = req.user.organisation_id;

    if (!count || count < 1 || count > 1000) {
      return res.status(400).json({ 
        error: 'Count muss zwischen 1 und 1000 liegen' 
      });
    }

    const codes = await qrGeneratorService.generateCodes(
      organisation_id, 
      count, 
      prefix || 'TM'
    );

    res.json({ 
      success: true,
      count: codes.length,
      codes 
    });
  } catch (err) {
    console.error('Generate codes error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GENERATE SEQUENTIAL CODES
// ============================================
exports.generateSequentialCodes = async (req, res) => {
  try {
    const { startNumber, count, prefix } = req.body;
    const organisation_id = req.user.organisation_id;

    if (!count || count < 1 || count > 1000) {
      return res.status(400).json({ 
        error: 'Count muss zwischen 1 und 1000 liegen' 
      });
    }

    if (!startNumber || startNumber < 1) {
      return res.status(400).json({ 
        error: 'Startnummer muss mindestens 1 sein' 
      });
    }

    const codes = await qrGeneratorService.generateSequentialCodes(
      organisation_id,
      startNumber,
      count,
      prefix || 'TM'
    );

    res.json({ 
      success: true,
      count: codes.length,
      codes 
    });
  } catch (err) {
    console.error('Generate sequential codes error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// DOWNLOAD PDF WITH QR CODES
// ============================================
exports.downloadPDF = async (req, res) => {
  try {
    const { codes, codesPerRow, codesPerPage, showLabel, companyName } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Keine Codes angegeben' });
    }

    if (codes.length > 500) {
      return res.status(400).json({ 
        error: 'Maximal 500 Codes pro PDF möglich' 
      });
    }

    const pdfBuffer = await qrGeneratorService.generateQRCodePDF(codes, {
      codesPerRow: codesPerRow || 4,
      codesPerPage: codesPerPage || 20,
      showLabel: showLabel !== false,
      companyName: companyName || 'TrapMap'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-codes-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download PDF error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// DOWNLOAD LABEL SHEET
// ============================================
exports.downloadLabelSheet = async (req, res) => {
  try {
    const { codes, format } = req.body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Keine Codes angegeben' });
    }

    if (codes.length > 500) {
      return res.status(400).json({ 
        error: 'Maximal 500 Codes pro PDF möglich' 
      });
    }

    const validFormats = ['avery-3651', 'avery-3652', 'avery-l7163'];
    const labelFormat = validFormats.includes(format) ? format : 'avery-3651';

    const pdfBuffer = await qrGeneratorService.generateLabelSheet(codes, labelFormat);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-labels-${labelFormat}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download label sheet error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET UNUSED CODES
// ============================================
exports.getUnusedCodes = async (req, res) => {
  try {
    const organisation_id = req.user.organisation_id;
    const limit = parseInt(req.query.limit) || 100;

    const codes = await qrGeneratorService.getUnusedCodes(organisation_id, limit);

    res.json({ 
      count: codes.length,
      codes 
    });
  } catch (err) {
    console.error('Get unused codes error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET CODE STATISTICS
// ============================================
exports.getStats = async (req, res) => {
  try {
    const organisation_id = req.user.organisation_id;
    const stats = await qrGeneratorService.getCodeStats(organisation_id);

    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GENERATE AND DOWNLOAD (Combined)
// ============================================
exports.generateAndDownload = async (req, res) => {
  try {
    const { count, prefix, format, sequential, startNumber } = req.body;
    const organisation_id = req.user.organisation_id;

    if (!count || count < 1 || count > 500) {
      return res.status(400).json({ 
        error: 'Count muss zwischen 1 und 500 liegen' 
      });
    }

    // Codes generieren
    let codes;
    if (sequential && startNumber) {
      codes = await qrGeneratorService.generateSequentialCodes(
        organisation_id,
        startNumber,
        count,
        prefix || 'TM'
      );
    } else {
      codes = await qrGeneratorService.generateCodes(
        organisation_id,
        count,
        prefix || 'TM'
      );
    }

    // PDF generieren
    let pdfBuffer;
    if (format && format.startsWith('avery')) {
      pdfBuffer = await qrGeneratorService.generateLabelSheet(codes, format);
    } else {
      pdfBuffer = await qrGeneratorService.generateQRCodePDF(codes, {
        codesPerRow: 4,
        codesPerPage: 20,
        showLabel: true,
        companyName: 'TrapMap'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="qr-codes-${count}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Generate and download error:', err);
    res.status(500).json({ error: err.message });
  }
};