// ============================================
// BOXTYPES ROUTES - FIXED
// Box/Trap Type Management
// FIX: { supabase } mit geschweiften Klammern!
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/supabase');  // ✅ FIX: { } hinzugefügt!

// ============================================
// GET /api/boxtypes
// Get all box types
// ============================================
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('box_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      data: data || [],
      boxtypes: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('❌ GET /api/boxtypes Error:', error);
    next(error);
  }
});

// ============================================
// GET /api/boxtypes/:id
// Get single box type by ID
// ============================================
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('box_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: 'Box type not found'
      });
    }

    res.json({ boxtype: data });
  } catch (error) {
    console.error('❌ GET /api/boxtypes/:id Error:', error);
    next(error);
  }
});

// ============================================
// POST /api/boxtypes
// Create new box type (admin only)
// ============================================
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, description, icon, default_settings } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'name required'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const { data, error } = await supabase
      .from('box_types')
      .insert({
        name,
        description,
        icon,
        default_settings,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Box type created successfully',
      boxtype: data
    });
  } catch (error) {
    console.error('❌ POST /api/boxtypes Error:', error);
    next(error);
  }
});

// ============================================
// PUT /api/boxtypes/:id
// Update box type (admin only)
// ============================================
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, default_settings } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const { data, error } = await supabase
      .from('box_types')
      .update({
        name,
        description,
        icon,
        default_settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Box type updated successfully',
      boxtype: data
    });
  } catch (error) {
    console.error('❌ PUT /api/boxtypes/:id Error:', error);
    next(error);
  }
});

// ============================================
// DELETE /api/boxtypes/:id
// Delete box type (admin only)
// ============================================
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const { error } = await supabase
      .from('box_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      message: 'Box type deleted successfully'
    });
  } catch (error) {
    console.error('❌ DELETE /api/boxtypes/:id Error:', error);
    next(error);
  }
});

module.exports = router;