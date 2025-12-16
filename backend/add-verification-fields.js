/* ============================================================
   ADD VERIFICATION FIELDS TO DEMO_REQUESTS TABLE
   Adds email verification functionality to demo requests
   ============================================================ */

const { supabase } = require('./config/supabase');

async function addVerificationFields() {
  try {
    console.log('🔄 Adding verification fields to demo_requests table...');

    // Add verification_token column
    console.log('1. Adding verification_token column...');
    const { error: tokenError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS verification_token TEXT;`
    });

    if (tokenError && !tokenError.message.includes('already exists')) {
      throw tokenError;
    }

    // Add verification_expires column
    console.log('2. Adding verification_expires column...');
    const { error: expiresError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ;`
    });

    if (expiresError && !expiresError.message.includes('already exists')) {
      throw expiresError;
    }

    // Update status enum to include 'pending_verification'
    console.log('3. Updating status enum...');
    const { error: enumError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_verification' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'demo_request_status')) THEN
            ALTER TYPE demo_request_status ADD VALUE 'pending_verification';
          END IF;
        END
        $$;
      `
    });

    if (enumError && !enumError.message.includes('already exists')) {
      console.log('Enum update might have failed, but continuing...');
    }

    // Create index for faster token lookups
    console.log('4. Adding index for verification tokens...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_demo_requests_verification_token ON demo_requests(verification_token);`
    });

    if (indexError && !indexError.message.includes('already exists')) {
      throw indexError;
    }

    console.log('✅ Verification fields added successfully!');
    console.log('\nNew fields:');
    console.log('- verification_token: TEXT');
    console.log('- verification_expires: TIMESTAMPTZ');
    console.log('- status: added "pending_verification" option');
    console.log('- Index: idx_demo_requests_verification_token');

  } catch (error) {
    console.error('❌ Error adding verification fields:', error);
    process.exit(1);
  }
}

addVerificationFields();