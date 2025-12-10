// ============================================
// AUTH SERVICE
// Business logic for authentication
// ============================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { sign, signRefresh, verify } = require('../utils/jwt');

/**
 * Login User
 */
const login = async (email, password) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, organisation_id, email, password_hash, role, first_name, last_name, active, must_change_password')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return { success: false, message: 'Ungültige E-Mail oder Passwort' };
    }

    if (!user.active) {
      return { success: false, message: 'Account ist deaktiviert. Bitte kontaktieren Sie Ihren Administrator.' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return { success: false, message: 'Ungültige E-Mail oder Passwort' };
    }

    // Generate tokens
    const payload = {
      user_id: user.id,
      organisation_id: user.organisation_id,
      email: user.email,
      role: user.role
    };

    const token = sign(payload);
    const refreshToken = signRefresh(payload);

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
        last_name: user.last_name,
        must_change_password: user.must_change_password || false
      }
    };
  } catch (error) {
    console.error('Login service error:', error);
    return { success: false, message: 'Login fehlgeschlagen' };
  }
};

/**
 * Refresh Access Token
 */
const refreshToken = async (refreshTokenStr) => {
  try {
    const decoded = verify(refreshTokenStr);
    if (!decoded) {
      return { success: false, message: 'Invalid or expired refresh token' };
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, organisation_id, email, role, active')
      .eq('id', decoded.user_id)
      .single();

    if (error || !user || !user.active) {
      return { success: false, message: 'User not found or inactive' };
    }

    const payload = {
      user_id: user.id,
      organisation_id: user.organisation_id,
      email: user.email,
      role: user.role
    };

    const token = sign(payload);
    return { success: true, token };
  } catch (error) {
    console.error('Token refresh service error:', error);
    return { success: false, message: 'Token refresh failed' };
  }
};

/**
 * Change Password (eingeloggt)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // User holen
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    // Aktuelles Passwort prüfen
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, message: 'Aktuelles Passwort ist falsch' };
    }

    // Neues Passwort hashen und speichern
    const newHash = await bcrypt.hash(newPassword, 12);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: newHash,
        must_change_password: false 
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, message: 'Fehler beim Speichern' };
    }

    return { success: true, message: 'Passwort erfolgreich geändert' };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, message: 'Fehler beim Ändern des Passworts' };
  }
};

/**
 * Set New Password (für must_change_password, ohne altes Passwort)
 */
const setNewPassword = async (userId, newPassword) => {
  try {
    const newHash = await bcrypt.hash(newPassword, 12);
    
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: newHash,
        must_change_password: false 
      })
      .eq('id', userId);

    if (error) {
      return { success: false, message: 'Fehler beim Speichern' };
    }

    return { success: true, message: 'Passwort erfolgreich gesetzt' };
  } catch (error) {
    console.error('Set password error:', error);
    return { success: false, message: 'Fehler beim Setzen des Passworts' };
  }
};

/**
 * Forgot Password - Sendet Reset-Email
 */
const forgotPassword = async (email, sendEmailFn) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase())
      .single();

    // Immer "Erfolg" zurückgeben um Email-Enumeration zu verhindern
    if (error || !user) {
      return { success: true, message: 'Falls ein Account existiert, wurde eine E-Mail gesendet' };
    }

    // Reset Token generieren
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000).toISOString(); // 1 Stunde

    // Token in DB speichern
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        reset_token: resetToken,
        reset_token_expires: resetExpires 
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Reset token save error:', updateError);
      return { success: false, message: 'Fehler beim Erstellen des Reset-Links' };
    }

    // Email senden
    if (sendEmailFn) {
      await sendEmailFn(user.email, {
        name: user.first_name,
        resetToken: resetToken
      });
    }

    return { success: true, message: 'Falls ein Account existiert, wurde eine E-Mail gesendet' };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, message: 'Fehler beim Zurücksetzen' };
  }
};

/**
 * Reset Password with Token
 */
const resetPasswordWithToken = async (token, newPassword) => {
  try {
    // User mit Token finden
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (error || !user) {
      return { success: false, message: 'Ungültiger oder abgelaufener Link' };
    }

    // Token-Ablauf prüfen
    if (new Date(user.reset_token_expires) < new Date()) {
      return { success: false, message: 'Link ist abgelaufen. Bitte erneut anfordern.' };
    }

    // Neues Passwort setzen
    const newHash = await bcrypt.hash(newPassword, 12);
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: newHash,
        reset_token: null,
        reset_token_expires: null,
        must_change_password: false
      })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, message: 'Fehler beim Speichern' };
    }

    return { success: true, message: 'Passwort erfolgreich geändert. Sie können sich jetzt einloggen.' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, message: 'Fehler beim Zurücksetzen' };
  }
};

module.exports = {
  login,
  refreshToken,
  changePassword,
  setNewPassword,
  forgotPassword,
  resetPasswordWithToken
};