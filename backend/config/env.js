require("dotenv").config();

const ALLOWED_LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:3000",
];

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  
  // Server Port: Defaults to 5000 for local development
  // Cloud platforms can override via PORT environment variable
  port: parseInt(process.env.PORT || "5000", 10),

  // CORS – fallback zu lokalen Origins
  corsOrigin:
    process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== ""
      ? process.env.CORS_ORIGIN
      : ALLOWED_LOCAL_ORIGINS,

  // JWT
  jwtSecret:
    process.env.JWT_SECRET || "trapmap-dev-secret-change-in-production",
  jwtExpiry: process.env.JWT_EXPIRY || "7d",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "30d",

  // SUPABASE — kompatibel mit altem & neuem Code!
  supabaseUrl: process.env.SUPABASE_URL,

  // dein Key aus .env → SUPABASE_SERVICE_KEY
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  // alias für alten Code, der SUPABASE_SERVICE_ROLE_KEY erwartet:
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_KEY,

  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

  // Limits
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

  logLevel: process.env.LOG_LEVEL || "info",
};

// Validierung
function validateConfig() {
  const required = ["jwtSecret", "supabaseUrl", "supabaseServiceKey"];
  const missing = required.filter((key) => !config[key] || config[key] === "");

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    process.exit(1);
  }

  console.log("✅ Environment configuration validated");
}

validateConfig();

module.exports = config;
