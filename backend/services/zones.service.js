// ============================================
// ZONES SERVICE
// Business Logic for Zones/Areas
// ============================================

const supabase = require('../config/supabase');

exports.getAllZones = async (filters = {}) => {
  try {
    let query = supabase.from('zones').select('*');
    if (filters.object_id) query = query.eq('object_id', filters.object_id);
    const { data, error } = await query;
    if (error) throw error;
    return { zones: data || [], count: data?.length || 0 };
  } catch (error) {
    throw error;
  }
};

exports.getZoneById = async (id) => {
  try {
    const { data, error } = await supabase.from('zones').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) {
      const err = new Error('Zone not found');
      err.statusCode = 404;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

exports.createZone = async (zoneData, userId) => {
  try {
    const { data, error } = await supabase
      .from('zones')
      .insert({ ...zoneData, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

exports.updateZone = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('zones')
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

exports.deleteZone = async (id) => {
  try {
    const { error } = await supabase.from('zones').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};
