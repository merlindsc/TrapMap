// ============================================
// LABELS SERVICE
// Business Logic for Labels/Tags
// ============================================

const supabase = require('../config/supabase');

exports.getAllLabels = async (filters = {}) => {
  try {
    let query = supabase.from('labels').select('*');
    if (filters.object_id) query = query.eq('object_id', filters.object_id);
    const { data, error } = await query;
    if (error) throw error;
    return { labels: data || [], count: data?.length || 0 };
  } catch (error) {
    throw error;
  }
};

exports.getLabelById = async (id) => {
  try {
    const { data, error } = await supabase.from('labels').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) {
      const err = new Error('Label not found');
      err.statusCode = 404;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

exports.createLabel = async (labelData, userId) => {
  try {
    const { data, error } = await supabase
      .from('labels')
      .insert({ ...labelData, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

exports.updateLabel = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('labels')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

exports.deleteLabel = async (id) => {
  try {
    const { error } = await supabase.from('labels').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};
