// ============================================
// BOXTYPES SERVICE
// Business Logic for Box Types
// ============================================

const supabase = require('../config/supabase');

exports.getAllBoxtypes = async () => {
  try {
    const { data, error } = await supabase
      .from('box_types')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return { boxtypes: data || [], count: data?.length || 0 };
  } catch (error) {
    throw error;
  }
};

exports.getBoxtypeById = async (id) => {
  try {
    const { data, error } = await supabase.from('box_types').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) {
      const err = new Error('Boxtype not found');
      err.statusCode = 404;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

exports.createBoxtype = async (boxtypeData, userId) => {
  try {
    const { data, error } = await supabase
      .from('box_types')
      .insert({ ...boxtypeData, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

exports.updateBoxtype = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('box_types')
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

exports.deleteBoxtype = async (id) => {
  try {
    const { error } = await supabase.from('box_types').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};
