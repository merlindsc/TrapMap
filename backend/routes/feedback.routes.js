// ============================================
// FEEDBACK ROUTES
// API-Routen für Feedback-System
// ============================================

const express = require('express');
const router = express.Router();
const { sendFeedbackEmail } = require('../services/feedback.service');
const { authenticate } = require('../middleware/auth');

/**
 * POST /api/feedback
 * Feedback direkt senden
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, rating, message, contactEmail } = req.body;
    const baseUser = req.user;
    
    // Vollständige User-Daten aus der Datenbank laden
    const { supabase } = require('../config/supabase');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, role, organisations(name)')
      .eq('id', baseUser.id)
      .single();
    
    if (userError) {
      console.error('Error loading user data:', userError);
    }
    
    const user = {
      ...baseUser,
      first_name: userData?.first_name,
      last_name: userData?.last_name,
      organisation_name: userData?.organisations?.name
    };

    if (!message?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feedback-Nachricht ist erforderlich' 
      });
    }

    const result = await sendFeedbackEmail({
      type,
      rating,
      message,
      contactEmail,
      user
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Feedback erfolgreich gesendet!' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Senden des Feedbacks' 
      });
    }

  } catch (error) {
    console.error('Feedback Route Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server-Fehler beim Senden des Feedbacks' 
    });
  }
});

module.exports = router;