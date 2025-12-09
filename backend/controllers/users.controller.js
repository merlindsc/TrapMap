// ============================================
// USERS CONTROLLER
// Business Logic for User Management
// ============================================

const supabase = require('../config/supabase');

// GET ALL USERS (Admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, last_login')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      users: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE USER
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, last_login')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });

    res.json({ user: data });
  } catch (error) {
    next(error);
  }
};

// UPDATE USER
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    // Users can only update their own profile unless admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        username,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email, username, role, created_at')
      .single();

    if (error) throw error;

    res.json({
      message: 'User updated successfully',
      user: data
    });
  } catch (error) {
    next(error);
  }
};

// DELETE USER (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// UPDATE USER ROLE (Admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['user', 'admin', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, email, username, role')
      .single();

    if (error) throw error;

    res.json({
      message: 'User role updated successfully',
      user: data
    });
  } catch (error) {
    next(error);
  }
};
