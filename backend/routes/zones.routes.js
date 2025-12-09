// ============================================
// ZONES ROUTES
// Zone/Area Management
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

// ============================================
// GET /api/zones
// Get all zones (optionally filtered by object_id)
// ============================================
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { object_id } = req.query;

    let query = supabase
      .from('zones')
      .select('*');

    if (object_id) {
      query = query.eq('object_id', object_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      zones: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/zones/:id
// Get single zone by ID
// ============================================
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: 'Zone not found'
      });
    }

    res.json({ zone: data });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/zones
// Create new zone
// ============================================
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { object_id, name, polygon_data, color } = req.body;

    if (!object_id || !name) {
      return res.status(400).json({
        error: 'object_id and name required'
      });
    }

    const { data, error } = await supabase
      .from('zones')
      .insert({
        object_id,
        name,
        polygon_data,
        color,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Zone created successfully',
      zone: data
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/zones/:id
// Update zone
// ============================================
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, polygon_data, color } = req.body;

    const { data, error } = await supabase
      .from('zones')
      .update({
        name,
        polygon_data,
        color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Zone updated successfully',
      zone: data
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/zones/:id
// Delete zone
// ============================================
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Zone deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;