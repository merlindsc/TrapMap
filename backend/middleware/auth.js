/* ============================================================
   TRAPMAP – AUTH MIDDLEWARE
   Mit Super-Admin Check und requireEditor
   ============================================================ */

const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Super-Admin E-Mails
const SUPER_ADMINS = [
  'admin@demo.trapmap.de',
  'merlin@trapmap.de',
  'hilfe@die-schaedlingsexperten.de'
];

/**
 * Standard Authentication Middleware
 */
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Kein Token vorhanden' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User aus DB laden - verschiedene Formate unterstützen
    const userId = decoded.userId || decoded.user_id || decoded.id;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, organisation_id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    // Super-Admin Status hinzufügen
    user.isSuperAdmin = SUPER_ADMINS.includes(user.email);

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
};

/**
 * Super-Admin Check Middleware
 */
exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  if (!SUPER_ADMINS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Keine Super-Admin Berechtigung' });
  }

  next();
};

/**
 * Admin Check Middleware (Organisation-Admin oder Super-Admin)
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  if (req.user.role !== 'admin' && !SUPER_ADMINS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Keine Admin-Berechtigung' });
  }

  next();
};

/**
 * Editor Check Middleware (Admin, Supervisor, oder Super-Admin)
 * Für Bearbeitung von Objekten, Boxen, etc.
 */
exports.requireEditor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  // Super-Admins haben immer Zugriff
  if (SUPER_ADMINS.includes(req.user.email)) {
    return next();
  }

  // Admin und Supervisor dürfen bearbeiten
  const editorRoles = ['admin', 'supervisor'];
  if (!editorRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Keine Bearbeitungsberechtigung' });
  }

  next();
};

/**
 * Role Check Middleware
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    // Super-Admins haben immer Zugriff
    if (SUPER_ADMINS.includes(req.user.email)) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    next();
  };
};

// Export SUPER_ADMINS für andere Module
exports.SUPER_ADMINS = SUPER_ADMINS;