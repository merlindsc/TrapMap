// ============================================
// PINS ROUTES
// Map Pin/Marker Management
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

// ============================================
// GET /api/pins
// Get all pins (optionally filtered by object_id or zone_id)
// ============================================
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { object_id, zone_id } = req.query;

    let query = supabase
      .from('pins')
      .select('*');

    if (object_id) {
      query = query.eq('object_id', object_id);
    }

    if (zone_id) {
      query = query.eq('zone_id', zone_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      pins: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/pins/:id
// Get single pin by ID
// ============================================
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: 'Pin not found'
      });
    }

    res.json({ pin: data });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/pins
// Create new pin
// ============================================
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { object_id, zone_id, latitude, longitude, title, description, type, icon } = req.body;

    if (!object_id || !latitude || !longitude) {
      return res.status(400).json({
        error: 'object_id, latitude, and longitude required'
      });
    }

    const { data, error } = await supabase
      .from('pins')
      .insert({
        object_id,
        zone_id,
        latitude,
        longitude,
        title,
        description,
        type,
        icon,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Pin created successfully',
      pin: data
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/pins/:id
// Update pin
// ============================================
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, title, description, type, icon, zone_id } = req.body;

    const { data, error } = await supabase
      .from('pins')
      .update({
        latitude,
        longitude,
        title,
        description,
        type,
        icon,
        zone_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Pin updated successfully',
      pin: data
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/pins/:id
// Delete pin
// ============================================
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Pin deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;