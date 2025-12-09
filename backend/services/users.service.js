// ============================================
// USERS SERVICE
// Business Logic for User Management
// ============================================

const supabase = require('../config/supabase');

// GET ALL USERS
exports.getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, last_login')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { users: data || [], count: data?.length || 0 };
  } catch (error) {
    throw error;
  }
};

// GET USER BY ID
exports.getUserById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, last_login')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

// UPDATE USER
exports.updateUser = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, email, username, role, created_at')
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

// DELETE USER
exports.deleteUser = async (id) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// UPDATE USER ROLE
exports.updateUserRole = async (id, role) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, email, username, role')
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};
