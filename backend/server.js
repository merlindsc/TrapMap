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

// Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.maptiler.com", "wss:"],
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'https://trapmap-app.onrender.com',
    'https://trap-map.de',
    'https://www.trap-map.de'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// PORT Configuration: The server will use the PORT environment variable if set,
// otherwise defaults to 5000. This allows flexibility for both local development
// (port 5000) and cloud platforms that assign ports dynamically.
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
  console.log('═════════════════════════════════════════════');
  console.log('🔐 Security Status:');
  console.log(`   Helmet: ✅ Active`);
  console.log(`   Rate Limiting: ✅ Active`);
  console.log(`   Input Sanitization: ${security ? '✅ Active' : '⚠️ Not loaded'}`);
  console.log(`   Login Protection: ${security ? '✅ Active' : '⚠️ Not loaded'}`);
  console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️ Using default!'}`);
  console.log('═════════════════════════════════════════════');
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