// ============================================
// AUTH SERVICE
// Business logic for authentication
// ============================================

const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { sign, signRefresh, verify } = require('../utils/jwt');

/**
 * Login User
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} Login result
 */
const login = async (email, password) => {
  try {
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, organisation_id, email, password_hash, role, first_name, last_name, active')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if user is active
    if (!user.active) {
      return {
        success: false,
        message: 'Account is inactive. Please contact your administrator.'
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Generate tokens
    const payload = {
      user_id: user.id,
      organisation_id: user.organisation_id,
      role: user.role
    };

    const token = sign(payload);
    const refreshToken = signRefresh(payload);

    // Return success with tokens and user data
    return {
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        organisation_id: user.organisation_id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      }
    };
  } catch (error) {
    console.error('Login service error:', error);
    return {
      success: false,
      message: 'Login failed due to server error'
    };
  }
};

/**
 * Refresh Access Token
 * @param {string} refreshToken 
 * @returns {Object} New token
 */
const refreshToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verify(refreshToken);

    if (!decoded) {
      return {
        success: false,
        message: 'Invalid or expired refresh token'
      };
    }

    // Verify user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, organisation_id, role, active')
      .eq('id', decoded.user_id)
      .single();

    if (error || !user || !user.active) {
      return {
        success: false,
        message: 'User not found or inactive'
      };
    }

    // Generate new access token
    const payload = {
      user_id: user.id,
      organisation_id: user.organisation_id,
      role: user.role
    };

    const token = sign(payload);

    return {
      success: true,
      token
    };
  } catch (error) {
    console.error('Token refresh service error:', error);
    return {
      success: false,
      message: 'Token refresh failed'
    };
  }
};

module.exports = {
  login,
  refreshToken
};