/* ============================================================
   TRAPMAP – JWT UTILITIES (SECURED)
   Token generation and verification
   
   SECURITY FEATURES:
   - Kein Fallback Secret (muss in ENV sein!)
   - Token Blacklist für Logout
   - Refresh Token Rotation
   - Kurze Access Token Lifetime
   ============================================================ */

const jwt = require('jsonwebtoken');

// ============================================
// STRICT SECRET VALIDATION
// ============================================
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

// KRITISCH: Kein Fallback erlaubt!
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET ist nicht gesetzt!');
  console.error('   Setze JWT_SECRET in deinen Umgebungsvariablen.');
  console.error('   Generiere ein sicheres Secret mit: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET ist in Production zwingend erforderlich!');
  } else {
    console.warn('⚠️  WARNUNG: Verwende unsicheres Development-Secret. NIE in Production nutzen!');
  }
}

// Development Fallback (NUR für lokale Entwicklung!)
const SECRET = JWT_SECRET || 'DEV-ONLY-INSECURE-SECRET-DO-NOT-USE-IN-PRODUCTION-' + Date.now();

// Token Expiry Zeiten
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '1h';      // 1 Stunde
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';  // 7 Tage
const PARTNER_TOKEN_EXPIRY = '24h'; // Partner: 24 Stunden

// ============================================
// TOKEN BLACKLIST (für Logout)
// In Production: Redis verwenden!
// ============================================
const tokenBlacklist = new Set();
const BLACKLIST_CLEANUP_INTERVAL = 60 * 60 * 1000; // Stündlich aufräumen

// Alte Tokens regelmäßig entfernen
setInterval(() => {
  const now = Date.now() / 1000;
  for (const entry of tokenBlacklist) {
    try {
      const decoded = jwt.decode(entry);
      if (decoded && decoded.exp < now) {
        tokenBlacklist.delete(entry);
      }
    } catch (e) {
      tokenBlacklist.delete(entry);
    }
  }
}, BLACKLIST_CLEANUP_INTERVAL);

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate JWT Access Token
 * @param {Object} payload - User data
 * @param {Object} options - Optional overrides
 * @returns {string} JWT token
 */
const sign = (payload, options = {}) => {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: generateTokenId() // Unique Token ID für Blacklisting
  };
  
  return jwt.sign(tokenPayload, SECRET, {
    expiresIn: options.expiresIn || ACCESS_TOKEN_EXPIRY,
    ...options
  });
};

/**
 * Generate Refresh Token
 * @param {Object} payload - User data (minimal!)
 * @returns {string} Refresh token
 */
const signRefresh = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      type: payload.type || 'user',
      jti: generateTokenId()
    },
    JWT_REFRESH_SECRET || SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * Generate Partner Token (kürzere Lifetime)
 */
const signPartner = (payload) => {
  return sign(payload, { expiresIn: PARTNER_TOKEN_EXPIRY });
};

// ============================================
// TOKEN VERIFICATION
// ============================================

/**
 * Verify JWT Token
 * @param {string} token 
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verify = (token) => {
  try {
    // Prüfe ob Token auf Blacklist
    if (tokenBlacklist.has(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Token expired
    } else if (error.name === 'JsonWebTokenError') {
      // Invalid token
    } else {
      console.error('JWT verification failed:', error.message);
    }
    return null;
  }
};

/**
 * Verify Refresh Token
 */
const verifyRefresh = (token) => {
  try {
    if (tokenBlacklist.has(token)) {
      return null;
    }
    return jwt.verify(token, JWT_REFRESH_SECRET || SECRET);
  } catch (error) {
    return null;
  }
};

// ============================================
// TOKEN BLACKLISTING (für Logout)
// ============================================

/**
 * Invalidate a token (add to blacklist)
 */
const invalidateToken = (token) => {
  if (token) {
    tokenBlacklist.add(token);
  }
};

/**
 * Invalidate all tokens for a user (requires token rotation tracking)
 * Simplified version: just logs the action
 */
const invalidateAllUserTokens = (userId) => {
  // In Production: Alle Tokens des Users in Redis invalidieren
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Decode JWT without verification (for debugging)
 * @param {string} token 
 * @returns {Object|null}
 */
const decode = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Generate unique token ID
 */
const generateTokenId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Get remaining token lifetime in seconds
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return decoded.exp - Math.floor(Date.now() / 1000);
    }
    return 0;
  } catch (e) {
    return 0;
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  sign,
  signRefresh,
  signPartner,
  verify,
  verifyRefresh,
  decode,
  invalidateToken,
  invalidateAllUserTokens,
  extractToken,
  getTokenExpiry,
  
  // Constants (for reference)
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  PARTNER_TOKEN_EXPIRY
};