// ============================================
// BOXTYPES CONTROLLER
// ============================================

const supabase = require('../config/supabase');

exports.getAllBoxtypes = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('box_types').select('*').order('name', { ascending: true });
    if (error) throw error;
    res.json({ boxtypes: data || [], count: data?.length || 0 });
  } catch (error) {
    next(error);
  }
};

exports.getBoxtypeById = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('box_types').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Boxtype not found' });
    res.json({ boxtype: data });
  } catch (error) {
    next(error);
  }
};

exports.createBoxtype = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { name, description, icon, default_settings } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { data, error } = await supabase.from('box_types').insert({ name, description, icon, default_settings, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Boxtype created', boxtype: data });
  } catch (error) {
    next(error);
  }
};

exports.updateBoxtype = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { name, description, icon, default_settings } = req.body;
    const { data, error } = await supabase.from('box_types').update({ name, description, icon, default_settings }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ message: 'Boxtype updated', boxtype: data });
  } catch (error) {
    next(error);
  }
};

exports.deleteBoxtype = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { error } = await supabase.from('box_types').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Boxtype deleted' });
  } catch (error) {
    next(error);
  }
};
