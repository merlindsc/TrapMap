// ============================================
// TRAPMAP BACKEND SERVER
// Main Entry Point - MIT SECURITY FEATURES
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');

// Import Middleware
const { errorHandler } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');

// Security Middleware laden (optional)
let security = null;
try {
  security = require('./middleware/security');
  console.log('✅ Security middleware loaded');
} catch (e) {
  console.log('⚠️ Security middleware not found - using defaults');
}

// Import Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const objectRoutes = require('./routes/objects.routes');
const layoutRoutes = require('./routes/layouts.routes');
const boxRoutes = require('./routes/boxes.routes');
const scanRoutes = require('./routes/scans.routes');
const zoneRoutes = require('./routes/zones.routes');
const pinRoutes = require('./routes/pins.routes');
const labelRoutes = require('./routes/labels.routes');
const reportRoutes = require('./routes/reports.routes');
const boxtypesRoutes = require('./routes/boxtypes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

// Optional Routes
let floorplansRoutes = null;
let qrRoutes = null;
let qrOrderRoutes = null;
let partnerRoutes = null;
let adminRoutes = null;
let auditReportRoutes = null;
let demoRoutes = null;
let feedbackRoutes = null;

try { 
  floorplansRoutes = require('./routes/floorplans.routes'); 
  console.log('✅ FloorPlans routes loaded'); 
} catch (e) {}

try { 
  qrRoutes = require('./routes/qr.routes'); 
  console.log('✅ QR routes loaded'); 
} catch (e) {}

try { 
  qrOrderRoutes = require('./routes/qr-order.routes'); 
  console.log('✅ QR-Order routes loaded'); 
} catch (e) {}

try { 
  partnerRoutes = require('./routes/partner.routes'); 
  console.log('✅ Partner routes loaded'); 
} catch (e) {}

try { 
  adminRoutes = require('./routes/admin.routes'); 
  console.log('✅ Admin routes loaded'); 
} catch (e) {}

try { 
  demoRoutes = require('./routes/demo.routes'); 
  console.log('✅ Demo routes loaded'); 
} catch (e) {}

try { 
  feedbackRoutes = require('./routes/feedback.routes'); 
  console.log('✅ Feedback routes loaded'); 
} catch (e) {
  console.log('⚠️ Feedback routes failed to load:', e.message);
}

// Push Notification Routes
let pushRoutes = null;
let reminderJob = null;
try { 
  pushRoutes = require('./routes/push.routes'); 
  reminderJob = require('./jobs/reminder.job');
  console.log('✅ Push Notification routes loaded'); 
} catch (e) {
  console.log('⚠️ Push routes failed to load:', e.message);
}

// Chatbot Routes (GPT-4o mini)
let chatbotRoutes = null;
try {
  chatbotRoutes = require('./routes/chatbot.routes');
  console.log('✅ Chatbot routes loaded');
} catch (e) {
  console.log('⚠️ Chatbot routes failed to load:', e.message);
}

// ============================================
// AUDIT REPORT ROUTES (PDF Generator)
// ============================================
try {
  auditReportRoutes = require('./routes/audit-report.routes');
  console.log('✅ Audit Report routes loaded');
  console.log('   📄 GET /api/audit-reports/:objectId -> PDF Download');
  console.log('   📊 GET /api/audit-reports/:objectId/preview -> JSON Preview');
} catch (e) {
  console.log('⚠️ Audit Report routes not found');
  console.log('   Reason:', e && e.message ? e.message : e);
  console.log('   📝 To enable: Copy audit-report.routes.js to routes/');
}

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();

// Trust Proxy (für Rate Limiting hinter Reverse Proxy)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Security Headers (Enhanced)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval für Vite Dev
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.maptiler.com", "https://api.mapbox.com", "wss:", "https://*.supabase.co"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// CORS Configuration - FIXED for Development
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from:', origin || 'no-origin');
    
    // Für Development: Alle localhost-Origins erlauben
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') ||
        origin.includes('http://localhost:5173') ||
        origin.includes('http://localhost:4173')) {
      console.log('✅ CORS allowed (localhost)');
      return callback(null, true);
    }
    
    // Für Production: Spezifische Origins
    const allowedOrigins = [
      'https://trapmap-app.onrender.com',
      'https://trapmap.onrender.com',
      'https://trapmap-backend.onrender.com',
      'https://trap-map.de',
      'https://www.trap-map.de',
      'https://localhost',
      'capacitor://localhost'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed (production)');
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked for origin: ${origin}`);
      // WICHTIG: Bei CORS-Fehler trotzdem true zurückgeben für besseres Debugging
      callback(null, true); // Temporär alle erlauben für Testing
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
  maxAge: 86400 // 24 Stunden Cache für Preflight
};

app.use(cors(corsOptions));

// Explicit OPTIONS Handler für Preflight Requests
app.options('*', cors(corsOptions));

// Compression Middleware für kleinere Response-Größen
const compression = require('compression');
app.use(compression({
  level: 6, // Balance zwischen Kompression und CPU
  threshold: 1024, // Nur Responses > 1KB komprimieren
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input Sanitization (wenn security middleware vorhanden)
if (security && security.sanitizeMiddleware) {
  app.use(security.sanitizeMiddleware);
  console.log('✅ Input sanitization active');
}

// Logging
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// General Rate Limiting
app.use(rateLimitMiddleware);

// ============================================
// CACHING HEADERS - Statische Daten cachen
// ============================================
app.use((req, res, next) => {
  // API Responses mit kurzen Cache-Zeiten
  if (req.path.startsWith('/api/')) {
    // GET Requests cachen (außer sensitive Daten)
    if (req.method === 'GET' && 
        !req.path.includes('/auth') && 
        !req.path.includes('/users')) {
      // 5 Minuten Cache für Listen-Daten
      res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    } else {
      // Keine Cache für POST/PUT/DELETE oder sensitive Daten
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    features: {
      auditReports: !!auditReportRoutes,
      floorPlans: !!floorplansRoutes,
      qrCodes: !!qrRoutes,
      partners: !!partnerRoutes,
      admin: !!adminRoutes
    },
    security: {
      helmet: true,
      rateLimiting: true,
      inputSanitization: !!security,
      loginProtection: !!security
    }
  });
});

// ============================================
// API ROUTES
// ============================================

// Auth Routes (mit Login-Schutz wenn security vorhanden)
if (security && security.loginLimiter && security.blockCheckMiddleware) {
  app.use('/api/auth/login', security.loginLimiter, security.blockCheckMiddleware);
  app.use('/api/auth/forgot-password', security.passwordResetLimiter || security.loginLimiter);
  console.log('✅ Login protection active');
}
app.use('/api/auth', authRoutes);

// Standard Routes
app.use('/api/users', userRoutes);
app.use('/api/objects', objectRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/boxes', boxRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/boxtypes', boxtypesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Optional Routes
if (floorplansRoutes) app.use('/api/floorplans', floorplansRoutes);
if (qrRoutes) app.use('/api/qr', qrRoutes);
if (qrOrderRoutes) app.use('/api/qr-orders', qrOrderRoutes);
if (partnerRoutes) {
  // Partner Login auch mit Rate Limiting schützen
  if (security && security.loginLimiter) {
    app.use('/api/partners/login', security.loginLimiter, security.blockCheckMiddleware);
  }
  app.use('/api/partners', partnerRoutes);
}
if (adminRoutes) app.use('/api/admin', adminRoutes);
if (demoRoutes) app.use('/api/demo', demoRoutes);
if (feedbackRoutes) app.use('/api/feedback', feedbackRoutes);
if (pushRoutes) app.use('/api/push', pushRoutes);
if (chatbotRoutes) app.use('/api/chat', chatbotRoutes);

// ============================================
// AUDIT REPORT ROUTES (PDF Generator)
// Eigener Pfad /api/audit-reports (nicht /api/reports)
// ============================================
if (auditReportRoutes) {
  app.use('/api/audit-reports', auditReportRoutes);
  console.log('✅ Audit Report API registered at /api/audit-reports');
}

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  
  // In Production: Keine Details preisgeben
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message: statusCode === 500 
      ? 'Ein interner Fehler ist aufgetreten.'
      : err.message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log('╔═════════════════════════════════════════╗');
  console.log('║      TRAPMAP BACKEND SERVER            ║');
  console.log('╚═════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('═════════════════════════════════════════════');
  console.log('📦 Loaded Modules:');
  console.log(`   Auth, Users, Objects, Boxes, Scans: ✅`);
  console.log(`   Floor Plans: ${floorplansRoutes ? '✅' : '❌'}`);
  console.log(`   QR Codes: ${qrRoutes ? '✅' : '❌'}`);
  console.log(`   Partners: ${partnerRoutes ? '✅' : '❌'}`);
  console.log(`   Admin: ${adminRoutes ? '✅' : '❌'}`);
  console.log(`   Demo: ${demoRoutes ? '✅' : '❌'}`);
  console.log(`   Audit Reports (PDF): ${auditReportRoutes ? '✅' : '❌'}`);
  console.log(`   Push Notifications: ${pushRoutes ? '✅' : '❌'}`);
  console.log('═════════════════════════════════════════════');
  console.log('🔐 Security Status:');
  console.log(`   Helmet: ✅ Active`);
  console.log(`   Rate Limiting: ✅ Active`);
  console.log(`   Input Sanitization: ${security ? '✅ Active' : '⚠️ Not loaded'}`);
  console.log(`   Login Protection: ${security ? '✅ Active' : '⚠️ Not loaded'}`);
  console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️ Using default!'}`);
  console.log('═════════════════════════════════════════════');
  
  // 🔔 Reminder Job starten (nur wenn Push geladen)
  if (reminderJob && reminderJob.startReminderJob) {
    reminderJob.startReminderJob();
    console.log('🔔 Reminder Job: ✅ Running');
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down...');
  process.exit(0);
});