// ============================================
// LABELS CONTROLLER
// ============================================

const supabase = require('../config/supabase');

exports.getAllLabels = async (req, res, next) => {
  try {
    const { object_id } = req.query;
    let query = supabase.from('labels').select('*');
    if (object_id) query = query.eq('object_id', object_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ labels: data || [], count: data?.length || 0 });
  } catch (error) {
    next(error);
  }
};

exports.getLabelById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('labels').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Label not found' });
    res.json({ label: data });
  } catch (error) {
    next(error);
  }
};

exports.createLabel = async (req, res, next) => {
  try {
    const { object_id, name, color, description } = req.body;
    if (!object_id || !name) return res.status(400).json({ error: 'object_id and name required' });
    const { data, error } = await supabase.from('labels').insert({ object_id, name, color, description, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Label created', label: data });
  } catch (error) {
    next(error);
  }
};

exports.updateLabel = async (req, res, next) => {
  try {
    const { name, color, description } = req.body;
    const { data, error } = await supabase.from('labels').update({ name, color, description }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Label updated', label: data });
  } catch (error) {
    next(error);
  }
};

exports.deleteLabel = async (req, res, next) => {
  try {
    const { error } = await supabase.from('labels').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Label deleted' });
  } catch (error) {
    next(error);
  }
};
