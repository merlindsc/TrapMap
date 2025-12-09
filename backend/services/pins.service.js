// ============================================
// PINS SERVICE
// Business Logic for Map Pins/Markers
// ============================================

const supabase = require('../config/supabase');

exports.getAllPins = async (filters = {}) => {
  try {
    let query = supabase.from('pins').select('*');
    if (filters.object_id) query = query.eq('object_id', filters.object_id);
    if (filters.zone_id) query = query.eq('zone_id', filters.zone_id);
    const { data, error } = await query;
    if (error) throw error;
    return { pins: data || [], count: data?.length || 0 };
  } catch (error) {
    throw error;
  }
};

exports.getPinById = async (id) => {
  try {
    const { data, error } = await supabase.from('pins').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) {
      const err = new Error('Pin not found');
      err.statusCode = 404;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

exports.createPin = async (pinData, userId) => {
  try {
    const { data, error } = await supabase
      .from('pins')
      .insert({ ...pinData, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

exports.updatePin = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('pins')
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

exports.deletePin = async (id) => {
  try {
    const { error } = await supabase.from('pins').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};
