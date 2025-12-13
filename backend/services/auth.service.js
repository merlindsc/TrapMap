// ============================================
// AUTH SERVICE
// Business logic for authentication
// MIT security.js und validation.js Kompatibilität
// ============================================

const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { sign, signRefresh, verify } = require('../utils/jwt');

// Versuche security.js zu laden (optional)
let logSecurityEvent = (event, data) => console.log(`🔐 ${event}:`, JSON.stringify(data));
let clearFailedLogins = () => {};
try {
  const security = require('../middleware/security');
  if (security.logSecurityEvent) logSecurityEvent = security.logSecurityEvent;
  if (security.clearFailedLogins) clearFailedLogins = security.clearFailedLogins;
} catch (e) {
  console.log('Security middleware not found - using console logging');
}

// Einfache Email-Validierung
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// ============================================
// LOGIN
// ============================================
const login = async (email, password, ip = null) => {
  try {
    console.log('🔐 Login attempt for:', email);

    // Input Validation
    if (!email || !isValidEmail(email)) {
      return { success: false, message: 'Ungültige E-Mail-Adresse' };
    }

    if (!password) {
      return { success: false, message: 'Passwort erforderlich' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // User suchen MIT Organisation (für required_fields)
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, organisation_id, email, password_hash, role, first_name, last_name, active, must_change_password,
        organisations (
          id, name, required_fields
        )
      `)
      .eq('email', normalizedEmail)
      .single();

    if (error) {
      console.error('Login DB error:', error);
      return { success: false, message: 'Login fehlgeschlagen' };
    }

    if (!user) {
      console.log('❌ User not found');
      logSecurityEvent('LOGIN_USER_NOT_FOUND', { email: normalizedEmail, ip });
      return { success: false, message: 'Ungültige Anmeldedaten' };
    }

    // Account aktiv?
    if (user.active === false) {
      console.log('❌ User inactive');
      logSecurityEvent('LOGIN_INACTIVE_ACCOUNT', { email: normalizedEmail, userId: user.id, ip });
      return { success: false, message: 'Ihr Account ist deaktiviert' };
    }

    // Passwort prüfen
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log('❌ Invalid password');
      logSecurityEvent('LOGIN_WRONG_PASSWORD', { email: normalizedEmail, userId: user.id, ip });
      return { success: false, message: 'Ungültige Anmeldedaten' };
    }

    // Erfolgreicher Login
    if (ip) {
      clearFailedLogins(ip, normalizedEmail);
    }

    // Token erstellen
    const payload = {
      user_id: user.id,
      organisation_id: user.organisation_id,
      role: user.role,
      email: user.email
    };

    const token = sign(payload);
    const refreshToken = signRefresh(payload);

    // Last login updaten
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    console.log('✅ Login successful for:', normalizedEmail);
    logSecurityEvent('LOGIN_SUCCESS', {
      email: normalizedEmail,
      userId: user.id,
      role: user.role,
      ip
    });

    // WICHTIG: success: true muss dabei sein!
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
        must_change_password: user.must_change_password || false,
        // Organisation-Daten für Frontend
        organisation: user.organisations ? {
          id: user.organisations.id,
          name: user.organisations.name,
          required_fields: user.organisations.required_fields || {
            bait: false,
            insect_type: false,
            notes: false,
            photo: false,
            gps: false
          }
        } : null
      }
    };
  } catch (error) {
    console.error('Login service error:', error);
    return { success: false, message: 'Login fehlgeschlagen' };
  }
};

// ============================================
// REFRESH TOKEN
// ============================================
const refreshToken = async (token) => {
  try {
    const decoded = verify(token);

    if (!decoded) {
      return { success: false, message: 'Invalid or expired refresh token' };
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, organisation_id, role, active, email')
      .eq('id', decoded.user_id)
      .single();

    if (error || !user || !user.active) {
      return { success: false, message: 'User not found or inactive' };
    }

    const payload = {
      user_id: user.id,
      organisation_id: user.organisation_id,
      role: user.role,
      email: user.email
    };

    const newToken = sign(payload);

    return { success: true, token: newToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, message: 'Token refresh failed' };
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash, email')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { success: false, message: 'User nicht gefunden' };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      logSecurityEvent('PASSWORD_CHANGE_WRONG_CURRENT', { userId, email: user.email });
      return { success: false, message: 'Aktuelles Passwort ist falsch' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        must_change_password: false
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, message: 'Passwort konnte nicht geändert werden' };
    }

    logSecurityEvent('PASSWORD_CHANGED', { userId, email: user.email });
    return { success: true, message: 'Passwort erfolgreich geändert' };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, message: 'Fehler beim Ändern des Passworts' };
  }
};

// ============================================
// SET NEW PASSWORD (first login)
// ============================================
const setNewPassword = async (userId, newPassword) => {
  try {
    const newHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        must_change_password: false
      })
      .eq('id', userId);

    if (error) {
      return { success: false, message: 'Passwort konnte nicht gesetzt werden' };
    }

    return { success: true, message: 'Passwort erfolgreich gesetzt' };
  } catch (error) {
    console.error('Set password error:', error);
    return { success: false, message: 'Fehler beim Setzen des Passworts' };
  }
};

// ============================================
// FORGOT PASSWORD
// ============================================
const forgotPassword = async (email, sendEmailFn = null) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success (security)
    if (!user) {
      return { success: true, message: 'Falls die E-Mail existiert, erhalten Sie einen Reset-Link.' };
    }

    const resetToken = sign({ user_id: user.id, type: 'reset' });

    await supabase
      .from('users')
      .update({ reset_token: resetToken })
      .eq('id', user.id);

    if (sendEmailFn) {
      await sendEmailFn(user.email, user.first_name, resetToken);
    }

    logSecurityEvent('PASSWORD_RESET_REQUESTED', { userId: user.id, email: user.email });
    return { success: true, message: 'Falls die E-Mail existiert, erhalten Sie einen Reset-Link.' };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: true, message: 'Falls die E-Mail existiert, erhalten Sie einen Reset-Link.' };
  }
};

// ============================================
// RESET PASSWORD WITH TOKEN
// ============================================
const resetPasswordWithToken = async (token, newPassword) => {
  try {
    const decoded = verify(token);

    if (!decoded || decoded.type !== 'reset') {
      return { success: false, message: 'Ungültiger oder abgelaufener Reset-Link' };
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, reset_token, email')
      .eq('id', decoded.user_id)
      .single();

    if (!user || user.reset_token !== token) {
      return { success: false, message: 'Ungültiger Reset-Link' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({
        password_hash: newHash,
        reset_token: null,
        must_change_password: false
      })
      .eq('id', decoded.user_id);

    logSecurityEvent('PASSWORD_RESET_COMPLETED', { userId: user.id, email: user.email });
    return { success: true, message: 'Passwort erfolgreich zurückgesetzt' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, message: 'Fehler beim Zurücksetzen des Passworts' };
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