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
    console.log('[LOGIN] Attempting login for:', email);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, organisation_id, email, password_hash, role, first_name, last_name, active, must_change_password')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log('[LOGIN] User not found or error:', error);
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

    console.log('[LOGIN] Success for user:', user.id, 'must_change_password:', user.must_change_password);

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
    console.error('[LOGIN] Service error:', error);
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
    console.log('[CHANGE-PASSWORD] userId:', userId);
    
    // User holen
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.log('[CHANGE-PASSWORD] User not found:', error);
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    // Aktuelles Passwort prüfen
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      console.log('[CHANGE-PASSWORD] Current password invalid');
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
      console.log('[CHANGE-PASSWORD] Update error:', updateError);
      return { success: false, message: 'Fehler beim Speichern' };
    }

    console.log('[CHANGE-PASSWORD] Success');
    return { success: true, message: 'Passwort erfolgreich geändert' };
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Catch error:', error);
    return { success: false, message: 'Fehler beim Ändern des Passworts' };
  }
};

/**
 * Set New Password (für must_change_password, ohne altes Passwort)
 */
const setNewPassword = async (userId, newPassword) => {
  try {
    console.log('[SET-PASSWORD] ====== START ======');
    console.log('[SET-PASSWORD] userId:', userId);
    console.log('[SET-PASSWORD] userId type:', typeof userId);
    console.log('[SET-PASSWORD] newPassword exists:', !!newPassword);
    console.log('[SET-PASSWORD] newPassword length:', newPassword?.length);
    
    const newHash = await bcrypt.hash(newPassword, 12);
    console.log('[SET-PASSWORD] Hash created successfully');
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: newHash,
        must_change_password: false 
      })
      .eq('id', userId)
      .select();

    console.log('[SET-PASSWORD] Supabase response data:', data);
    console.log('[SET-PASSWORD] Supabase error:', error);

    if (error) {
      console.log('[SET-PASSWORD] Returning error response');
      return { success: false, message: 'Fehler beim Speichern' };
    }

    if (!data || data.length === 0) {
      console.log('[SET-PASSWORD] No rows updated - user not found?');
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    console.log('[SET-PASSWORD] ====== SUCCESS ======');
    return { success: true, message: 'Passwort erfolgreich gesetzt' };
  } catch (error) {
    console.error('[SET-PASSWORD] ====== CATCH ERROR ======');
    console.error('[SET-PASSWORD] Error:', error);
    return { success: false, message: 'Fehler beim Setzen des Passworts' };
  }
};

/**
 * Forgot Password - Sendet Reset-Email
 */
const forgotPassword = async (email, sendEmailFn) => {
  try {
    console.log('[FORGOT-PASSWORD] Email:', email);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase())
      .single();

    // Immer "Erfolg" zurückgeben um Email-Enumeration zu verhindern
    if (error || !user) {
      console.log('[FORGOT-PASSWORD] User not found (returning success anyway)');
      return { success: true, message: 'Falls ein Account existiert, wurde eine E-Mail gesendet' };
    }

    // Reset Token generieren
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000).toISOString(); // 1 Stunde

    console.log('[FORGOT-PASSWORD] Generated token for user:', user.id);

    // Token in DB speichern
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        reset_token: resetToken,
        reset_token_expires: resetExpires 
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[FORGOT-PASSWORD] Token save error:', updateError);
      return { success: false, message: 'Fehler beim Erstellen des Reset-Links' };
    }

    // Email senden
    if (sendEmailFn) {
      console.log('[FORGOT-PASSWORD] Sending email...');
      await sendEmailFn(user.email, {
        name: user.first_name,
        resetToken: resetToken
      });
      console.log('[FORGOT-PASSWORD] Email sent');
    } else {
      console.log('[FORGOT-PASSWORD] No email function provided');
    }

    return { success: true, message: 'Falls ein Account existiert, wurde eine E-Mail gesendet' };
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Catch error:', error);
    return { success: false, message: 'Fehler beim Zurücksetzen' };
  }
};

/**
 * Reset Password with Token
 */
const resetPasswordWithToken = async (token, newPassword) => {
  try {
    console.log('[RESET-PASSWORD] Token provided:', !!token);
    
    // User mit Token finden
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (error || !user) {
      console.log('[RESET-PASSWORD] Invalid token:', error);
      return { success: false, message: 'Ungültiger oder abgelaufener Link' };
    }

    // Token-Ablauf prüfen
    if (new Date(user.reset_token_expires) < new Date()) {
      console.log('[RESET-PASSWORD] Token expired');
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
      console.log('[RESET-PASSWORD] Update error:', updateError);
      return { success: false, message: 'Fehler beim Speichern' };
    }

    console.log('[RESET-PASSWORD] Success for user:', user.id);
    return { success: true, message: 'Passwort erfolgreich geändert. Sie können sich jetzt einloggen.' };
  } catch (error) {
    console.error('[RESET-PASSWORD] Catch error:', error);
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