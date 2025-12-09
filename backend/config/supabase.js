const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

const supabase = createClient(
  config.SUPABASE_URL || config.supabaseUrl,
  config.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceKey
);

module.exports = { supabase };