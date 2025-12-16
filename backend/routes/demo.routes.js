/* ============================================================
   TRAPMAP – DEMO REQUEST ROUTES
   Handles demo account requests from landing page
   ============================================================ */

const express = require('express');
const router = express.Router();
const demoService = require('../services/demo.service');

// ============================================
// POST /api/demo/request
// Submit demo request from landing page
// ============================================
router.post('/request', async (req, res) => {
  try {
    const { name, company, email, phone, expectations } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Name und E-Mail sind erforderlich' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Ungültige E-Mail-Adresse' 
      });
    }

    const result = await demoService.submitDemoRequest({
      name,
      company,
      email,
      phone,
      expectations
    });

    res.json({ 
      success: true, 
      message: 'Demo-Anfrage erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
      id: result.id
    });

  } catch (error) {
    console.error('Demo request error:', error);
    
    // Handle duplicate email error with proper status code
    if (error.message.includes('liegt bereits eine Demo-Anfrage vor')) {
      return res.status(400).json({ 
        error: 'Duplicate Email',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Fehler beim Übermitteln der Demo-Anfrage',
      message: error.message 
    });
  }
});

// ============================================
// GET /api/demo/requests (Admin only)
// List all demo requests
// ============================================
router.get('/requests', async (req, res) => {
  try {
    // Simple admin check - in real app would use proper middleware
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requests = await demoService.getDemoRequests();
    res.json(requests);

  } catch (error) {
    console.error('Get demo requests error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Laden der Demo-Anfragen',
      message: error.message 
    });
  }
});

// ============================================
// POST /api/demo/create-account/:id
// Create demo account from request (Admin only)
// ============================================
router.post('/create-account/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, trial_days = 90 } = req.body;

    const result = await demoService.createDemoAccount(id, { password, trial_days });

    res.json({
      success: true,
      message: 'Demo-Account erfolgreich erstellt',
      account: result
    });

  } catch (error) {
    console.error('Create demo account error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Erstellen des Demo-Accounts',
      message: error.message 
    });
  }
});

// ============================================
// DELETE /api/demo/requests/:id (Admin only)
// Delete demo request
// ============================================
router.delete('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await demoService.deleteDemoRequest(id);

    res.json({
      success: true,
      message: 'Demo-Anfrage erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('Delete demo request error:', error);
    res.status(500).json({ 
      error: 'Fehler beim Löschen der Demo-Anfrage',
      message: error.message 
    });
  }
});

// ============================================
// GET /api/demo/verify/:token
// Verify email and auto-create demo account
// ============================================
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await demoService.verifyDemoRequest(token);

    res.json({
      success: true,
      message: result.message,
      redirect: '/login',
      account: {
        email: result.account.user.email,
        organization: result.account.organization.name
      }
    });

  } catch (error) {
    console.error('Verify demo request error:', error);
    res.status(400).json({ 
      error: 'Verifizierung fehlgeschlagen',
      message: error.message 
    });
  }
});

module.exports = router;