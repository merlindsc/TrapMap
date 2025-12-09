// ============================================
// PINS CONTROLLER
// ============================================

const supabase = require('../config/supabase');

exports.getAllPins = async (req, res, next) => {
  try {
    const { object_id, zone_id } = req.query;
    let query = supabase.from('pins').select('*');
    if (object_id) query = query.eq('object_id', object_id);
    if (zone_id) query = query.eq('zone_id', zone_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ pins: data || [], count: data?.length || 0 });
  } catch (error) {
    next(error);
  }
};

exports.getPinById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('pins').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Pin not found' });
    res.json({ pin: data });
  } catch (error) {
    next(error);
  }
};

exports.createPin = async (req, res, next) => {
  try {
    const { object_id, zone_id, latitude, longitude, title, description, type, icon } = req.body;
    if (!object_id || !latitude || !longitude) return res.status(400).json({ error: 'object_id, lat, lng required' });
    const { data, error } = await supabase.from('pins').insert({ object_id, zone_id, latitude, longitude, title, description, type, icon, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Pin created', pin: data });
  } catch (error) {
    next(error);
  }
};

exports.updatePin = async (req, res, next) => {
  try {
    const { latitude, longitude, title, description, type, icon, zone_id } = req.body;
    const { data, error } = await supabase.from('pins').update({ latitude, longitude, title, description, type, icon, zone_id }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Pin updated', pin: data });
  } catch (error) {
    next(error);
  }
};

exports.deletePin = async (req, res, next) => {
  try {
    const { error } = await supabase.from('pins').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Pin deleted' });
  } catch (error) {
    next(error);
  }
};
