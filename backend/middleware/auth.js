// ============================================
// AUTHENTICATION MIDDLEWARE (MIT SECURITY)
// JWT Verification & User Context
// ============================================

const { verify } = require('../utils/jwt');

// Security Features laden (optional)
let logSecurityEvent = (event, data) => console.log(`🔐 ${event}:`, JSON.stringify(data));
try {
  const security = require('./security');
  if (security.logSecurityEvent) logSecurityEvent = security.logSecurityEvent;
} catch (e) {
  // Security middleware nicht vorhanden - kein Problem
}

/**
 * Verify JWT Token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("🔐 Auth Middleware:");
    console.log("  - Authorization Header:", authHeader ? `Present (${authHeader.substring(0, 20)}...)` : "Missing");

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("❌ Auth Failed: No token provided");
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    console.log("  - Token extracted:", token ? `${token.substring(0, 20)}...` : "empty");
    
    const decoded = verify(token);

    if (!decoded) {
      console.log("❌ Auth Failed: Invalid or expired token");
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    console.log("  - Token decoded successfully");
    console.log("  - Decoded payload:", JSON.stringify({
      user_id: decoded.user_id || decoded.id,
      role: decoded.role,
      organisation_id: decoded.organisation_id,
      email: decoded.email
    }));

    req.user = {
      id: decoded.user_id || decoded.id,
      role: decoded.role,
      organisation_id: decoded.organisation_id,
      email: decoded.email
    };

    console.log("✅ Auth Successful - User attached to request");
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Authenticate Partner Token
 */
const authenticatePartner = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verify(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    if (decoded.type !== 'partner') {
      logSecurityEvent('PARTNER_ACCESS_DENIED', { userId: decoded.id, type: decoded.type });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Partner access required'
      });
    }

    req.partner = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      company: decoded.company,
      organisation_id: decoded.organisation_id,
      objectIds: decoded.objectIds || []
    };

    next();
  } catch (error) {
    console.error('Partner auth error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user has required role
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logSecurityEvent('ACCESS_DENIED', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    next();
  };
};

/**
 * Super Admin Check
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || 'admin@demo.trapmap.de,merlin@trapmap.de,hilfe@die-schaedlingsexperten.de')
    .split(',')
    .map(e => e.trim().toLowerCase());

  if (!SUPER_ADMINS.includes(req.user.email.toLowerCase())) {
    logSecurityEvent('SUPER_ADMIN_DENIED', { email: req.user.email, path: req.path });
    return res.status(403).json({ error: 'Forbidden', message: 'Super-Admin Rechte erforderlich' });
  }

  next();
};

// Convenience Middlewares
const requireAdmin = requireRole(['admin']);
const requireEditor = requireRole(['admin', 'supervisor']);
const requireScanner = requireRole(['admin', 'supervisor', 'technician', 'partner']);
const requireViewer = requireRole(['admin', 'supervisor', 'technician', 'auditor', 'viewer', 'partner']);

module.exports = {
  authenticate,
  authenticatePartner,
  requireRole,
  requireAdmin,
  requireEditor,
  requireScanner,
  requireViewer,
  requireSuperAdmin
};