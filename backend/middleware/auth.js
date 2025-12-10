// ============================================
// AUTHENTICATION MIDDLEWARE
// JWT Verification & User Context
// ============================================

const { verify } = require('../utils/jwt');

/**
 * Verify JWT Token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const decoded = verify(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user data to request - MIT EMAIL!
    req.user = {
      id: decoded.user_id,
      role: decoded.role,
      organisation_id: decoded.organisation_id,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user has required role
 * @param {string[]} allowedRoles 
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
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const requireAdmin = requireRole(['admin']);

/**
 * Check if user can edit (admin or supervisor)
 */
const requireEditor = requireRole(['admin', 'supervisor']);

/**
 * Check if user can scan (admin, supervisor, technician, partner)
 */
const requireScanner = requireRole(['admin', 'supervisor', 'technician', 'partner']);

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireEditor,
  requireScanner
};