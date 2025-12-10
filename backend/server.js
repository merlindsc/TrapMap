// ============================================
// TRAPMAP BACKEND SERVER
// Main Entry Point
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');

// Import Middleware
const { errorHandler } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');

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
const adminRoutes = require('./routes/admin.routes');

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security Headers
app.use(helmet());

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
  credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting
app.use(rateLimitMiddleware);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
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
app.use('/api/admin', adminRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ERROR HANDLER (Must be last)
// ============================================

app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║      TRAPMAP BACKEND SERVER            ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('══════════════════════════════════════════');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});