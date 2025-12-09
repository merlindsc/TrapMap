// ============================================
// ZONES CONTROLLER
// ============================================

const supabase = require('../config/supabase');

exports.getAllZones = async (req, res, next) => {
  try {
    const { object_id } = req.query;
    let query = supabase.from('zones').select('*');
    if (object_id) query = query.eq('object_id', object_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ zones: data || [], count: data?.length || 0 });
  } catch (error) {
    next(error);
  }
};

exports.getZoneById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('zones').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Zone not found' });
    res.json({ zone: data });
  } catch (error) {
    next(error);
  }
};

exports.createZone = async (req, res, next) => {
  try {
    const { object_id, name, polygon_data, color } = req.body;
    if (!object_id || !name) return res.status(400).json({ error: 'object_id and name required' });
    const { data, error } = await supabase.from('zones').insert({ object_id, name, polygon_data, color, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Zone created', zone: data });
  } catch (error) {
    next(error);
  }
};

exports.updateZone = async (req, res, next) => {
  try {
    const { name, polygon_data, color } = req.body;
    const { data, error } = await supabase.from('zones').update({ name, polygon_data, color }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Zone updated', zone: data });
  } catch (error) {
    next(error);
  }
};

exports.deleteZone = async (req, res, next) => {
  try {
    const { error } = await supabase.from('zones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Zone deleted' });
  } catch (error) {
    next(error);
  }
};
