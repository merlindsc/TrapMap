/* ============================================================
   TRAPMAP – QR-ORDER CONTROLLER
   Super-Admin Endpunkte für QR-Code Bestellungen
   ============================================================ */

const qrOrderService = require('../services/qr-order.service');

// ============================================
// PREIS BERECHNEN
// ============================================
exports.calculatePrice = async (req, res) => {
  try {
    const { quantity } = req.query;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Ungültige Anzahl' });
    }

    const pricing = qrOrderService.calculatePrice(parseInt(quantity));
    res.json(pricing);
  } catch (err) {
    console.error('Calculate price error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// ORGANISATIONS-PRÄFIX
// ============================================
exports.getOrganisationPrefix = async (req, res) => {
  try {
    const { organisationId } = req.params;
    const data = await qrOrderService.getOrganisationPrefix(organisationId);
    res.json(data);
  } catch (err) {
    console.error('Get prefix error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.setOrganisationPrefix = async (req, res) => {
  try {
    const { organisationId } = req.params;
    const { prefix } = req.body;

    if (!prefix || prefix.length < 2) {
      return res.status(400).json({ error: 'Präfix muss mindestens 2 Zeichen haben' });
    }

    const newPrefix = await qrOrderService.setOrganisationPrefix(organisationId, prefix);
    res.json({ prefix: newPrefix });
  } catch (err) {
    console.error('Set prefix error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// BESTELLUNG ERSTELLEN (Nur erstellen, nicht versenden)
// ============================================
exports.createOrder = async (req, res) => {
  try {
    const { organisationId, quantity } = req.body;

    if (!organisationId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Organisation und Anzahl erforderlich' });
    }

    if (quantity > 5000) {
      return res.status(400).json({ error: 'Maximal 5000 Codes pro Bestellung' });
    }

    const result = await qrOrderService.createOrder(
      organisationId,
      parseInt(quantity),
      req.user.id
    );

    res.json(result);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// CODES GENERIEREN
// ============================================
exports.generateCodes = async (req, res) => {
  try {
    const { orderId } = req.params;
    const codes = await qrOrderService.generateCodesForOrder(orderId);
    res.json({ success: true, count: codes.length });
  } catch (err) {
    console.error('Generate codes error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// PDF HERUNTERLADEN
// ============================================
exports.downloadPDF = async (req, res) => {
  try {
    const { orderId } = req.params;
    const pdfBuffer = await qrOrderService.generateOrderPDF(orderId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TrapMap-QR-Codes-${orderId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Download PDF error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// PER E-MAIL VERSENDEN
// ============================================
exports.sendByEmail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.body;

    const result = await qrOrderService.sendOrderByEmail(orderId, email);
    res.json(result);
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// KOMPLETTER WORKFLOW (Ein Klick!)
// ============================================
exports.processCompleteOrder = async (req, res) => {
  try {
    const { organisationId, quantity, email } = req.body;

    if (!organisationId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Organisation und Anzahl erforderlich' });
    }

    if (quantity > 5000) {
      return res.status(400).json({ error: 'Maximal 5000 Codes pro Bestellung' });
    }

    const result = await qrOrderService.processCompleteOrder(
      organisationId,
      parseInt(quantity),
      req.user.id,
      email
    );

    res.json(result);
  } catch (err) {
    console.error('Process order error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// STATISTIKEN
// ============================================
exports.getOrganisationStats = async (req, res) => {
  try {
    const { organisationId } = req.params;
    const stats = await qrOrderService.getOrganisationStats(organisationId);
    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllOrganisationsStats = async (req, res) => {
  try {
    const stats = await qrOrderService.getAllOrganisationsStats();
    res.json(stats);
  } catch (err) {
    console.error('Get all stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// BESTELLHISTORIE
// ============================================
exports.getOrders = async (req, res) => {
  try {
    const { organisationId } = req.query;
    
    let query = supabase
      .from('qr_orders')
      .select('*, organisations(name)')
      .order('created_at', { ascending: false });

    if (organisationId) {
      query = query.eq('organisation_id', organisationId);
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);

    res.json(data);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: err.message });
  }
};