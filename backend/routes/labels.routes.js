// ============================================
// LABELS ROUTES
// Label/Tag Management
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

// ============================================
// GET /api/labels
// Get all labels (optionally filtered by object_id)
// ============================================
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { object_id } = req.query;

    let query = supabase
      .from('labels')
      .select('*');

    if (object_id) {
      query = query.eq('object_id', object_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      labels: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/labels/:id
// Get single label by ID
// ============================================
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: 'Label not found'
      });
    }

    res.json({ label: data });
  } catch (error) {
    next(error);
  }
});

// ============================================
// POST /api/labels
// Create new label
// ============================================
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { object_id, name, color, description } = req.body;

    if (!object_id || !name) {
      return res.status(400).json({
        error: 'object_id and name required'
      });
    }

    const { data, error } = await supabase
      .from('labels')
      .insert({
        object_id,
        name,
        color,
        description,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Label created successfully',
      label: data
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PUT /api/labels/:id
// Update label
// ============================================
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, description } = req.body;

    const { data, error } = await supabase
      .from('labels')
      .update({
        name,
        color,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Label updated successfully',
      label: data
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE /api/labels/:id
// Delete label
// ============================================
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('labels')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Label deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;