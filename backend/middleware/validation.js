/* ============================================================
   TRAPMAP – INPUT VALIDATION
   Zentrale Validierungslogik für alle Eingaben
   
   Verwendet einfache Regex-basierte Validierung
   Für komplexere Fälle: Joi oder Zod empfohlen
   ============================================================ */

// ============================================
// EMAIL VALIDATION
// ============================================
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// ============================================
// PASSWORD VALIDATION
// ============================================
const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false
  } = options;

  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Passwort erforderlich'] };
  }

  if (password.length < minLength) {
    errors.push(`Mindestens ${minLength} Zeichen erforderlich`);
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe erforderlich');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe erforderlich');
  }
  
  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Mindestens eine Zahl erforderlich');
  }
  
  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Mindestens ein Sonderzeichen erforderlich');
  }

  // Häufige schlechte Passwörter blocken
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password1', '111111', '1234567', 'iloveyou', 'admin'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Dieses Passwort ist zu häufig verwendet');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

const calculatePasswordStrength = (password) => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  if (score <= 6) return 'strong';
  return 'very_strong';
};

// ============================================
// NAME VALIDATION
// ============================================
const isValidName = (name, options = {}) => {
  const { minLength = 2, maxLength = 100 } = options;
  
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) return false;
  
  // Nur Buchstaben, Leerzeichen, Bindestriche, Apostrophe
  const nameRegex = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
  return nameRegex.test(trimmed);
};

// ============================================
// PHONE VALIDATION
// ============================================
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Entferne alle nicht-numerischen Zeichen außer +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Mindestens 6 Ziffern
  return cleaned.replace(/\D/g, '').length >= 6;
};

// ============================================
// ID VALIDATION (für Supabase IDs)
// ============================================
const isValidId = (id, type = 'integer') => {
  if (id === null || id === undefined) return false;
  
  if (type === 'uuid') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  
  if (type === 'integer') {
    const parsed = parseInt(id);
    return !isNaN(parsed) && parsed > 0 && parsed.toString() === id.toString();
  }
  
  return false;
};

// ============================================
// URL VALIDATION
// ============================================
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
};

// ============================================
// DATE VALIDATION
// ============================================
const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

const isValidFutureDate = (dateString) => {
  if (!isValidDate(dateString)) return false;
  return new Date(dateString) > new Date();
};

// ============================================
// SANITIZATION
// ============================================
const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // HTML Tags entfernen
    .replace(/javascript:/gi, '') // JS Protocol
    .replace(/on\w+=/gi, ''); // Event Handlers
};

const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Entferne alle HTML Tags
  return html.replace(/<[^>]*>/g, '');
};

const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'file';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
};

// ============================================
// REQUEST BODY VALIDATORS
// ============================================
const validateLoginRequest = (body) => {
  const errors = [];
  
  if (!body.email) {
    errors.push('E-Mail erforderlich');
  } else if (!isValidEmail(body.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }
  
  if (!body.password) {
    errors.push('Passwort erforderlich');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateRegisterRequest = (body) => {
  const errors = [];
  
  if (!body.email) {
    errors.push('E-Mail erforderlich');
  } else if (!isValidEmail(body.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }
  
  if (!body.password) {
    errors.push('Passwort erforderlich');
  } else {
    const pwValidation = validatePassword(body.password);
    if (!pwValidation.isValid) {
      errors.push(...pwValidation.errors);
    }
  }
  
  if (!body.name) {
    errors.push('Name erforderlich');
  } else if (!isValidName(body.name)) {
    errors.push('Ungültiger Name');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validatePartnerRequest = (body) => {
  const errors = [];
  
  if (!body.email) {
    errors.push('E-Mail erforderlich');
  } else if (!isValidEmail(body.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }
  
  if (!body.password) {
    errors.push('Passwort erforderlich');
  } else if (body.password.length < 8) {
    errors.push('Passwort muss mindestens 8 Zeichen haben');
  }
  
  if (!body.name) {
    errors.push('Name erforderlich');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================
// VALIDATION MIDDLEWARE GENERATOR
// ============================================
const createValidator = (validatorFn) => {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    
    if (!result.isValid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Ungültige Eingabedaten',
        details: result.errors
      });
    }
    
    next();
  };
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Validators
  isValidEmail,
  validatePassword,
  isValidName,
  isValidPhone,
  isValidId,
  isValidUrl,
  isValidDate,
  isValidFutureDate,
  
  // Sanitizers
  sanitizeString,
  sanitizeHtml,
  sanitizeFilename,
  
  // Request Validators
  validateLoginRequest,
  validateRegisterRequest,
  validatePartnerRequest,
  
  // Middleware
  createValidator
};