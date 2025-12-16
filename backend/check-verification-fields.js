/* ============================================================
   ADD VERIFICATION FIELDS VIA SUPABASE API
   Adds verification fields using direct table operations
   ============================================================ */

const { supabase } = require('./config/supabase');

async function addVerificationFieldsViaAPI() {
  try {
    console.log('🔄 Testing current demo_requests structure...');

    // Test current table structure
    const { data: sampleData, error: testError } = await supabase
      .from('demo_requests')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error accessing demo_requests:', testError);
      return;
    }

    console.log('✅ Current demo_requests table accessible');
    
    if (sampleData && sampleData.length > 0) {
      console.log('📋 Current columns:', Object.keys(sampleData[0]));
      
      // Check if verification fields already exist
      if (sampleData[0].hasOwnProperty('verification_token')) {
        console.log('✅ verification_token field already exists');
      } else {
        console.log('❌ verification_token field missing');
      }
      
      if (sampleData[0].hasOwnProperty('verification_expires')) {
        console.log('✅ verification_expires field already exists');
      } else {
        console.log('❌ verification_expires field missing');
      }
    } else {
      console.log('ℹ️  No demo requests found, creating test record...');
      
      // Create test record to trigger any missing columns
      const testRequest = {
        name: 'Test Verification',
        company: 'Test Company',
        email: 'test-verification@example.com',
        phone: '+49 123 456',
        expectations: 'Testing verification fields',
        status: 'pending'
      };

      const { data: newData, error: insertError } = await supabase
        .from('demo_requests')
        .insert([testRequest])
        .select();

      if (insertError) {
        console.error('❌ Insert test failed:', insertError);
      } else {
        console.log('✅ Test record created:', newData[0]);
        console.log('📋 Available columns:', Object.keys(newData[0]));
      }
    }

    console.log('\n📄 Next steps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the SQL from verification-fields.sql');
    console.log('3. Or manually add columns in Table Editor:');
    console.log('   - verification_token (TEXT)');
    console.log('   - verification_expires (TIMESTAMPTZ)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addVerificationFieldsViaAPI();