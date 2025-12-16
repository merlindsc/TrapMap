/* ============================================================
   TEST DEMO ACCOUNT CREATION
   Quick test script to verify demo account functionality
   ============================================================ */

const { supabase } = require('./config/supabase');
const demoService = require('./services/demo.service');

async function testDemoAccountCreation() {
  try {
    console.log('🧪 Testing demo account creation...\n');

    // 1. First, create a test demo request
    console.log('1. Creating test demo request...');
    const testRequest = {
      name: 'Max Mustermann',
      company: 'Mustermann Test GmbH',
      email: 'max.mustermann@example.com',
      phone: '+49 123 456789',
      expectations: 'Ich möchte TrapMap für unser Unternehmen testen',
      status: 'pending'
    };

    const { data: demoRequest, error: requestError } = await supabase
      .from('demo_requests')
      .insert([testRequest])
      .select()
      .single();

    if (requestError) throw requestError;
    console.log('✅ Demo request created with ID:', demoRequest.id);

    // 2. Now test creating the demo account
    console.log('\n2. Creating demo account...');
    const result = await demoService.createDemoAccount(demoRequest.id, {
      trial_days: 30
    });

    console.log('✅ Demo account created successfully!');
    console.log('📊 Result:', {
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        contact_name: result.organization.contact_name
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role
      },
      login_url: result.login_url
    });

    // 3. Verify the demo request was updated
    console.log('\n3. Verifying demo request status...');
    const { data: updatedRequest, error: checkError } = await supabase
      .from('demo_requests')
      .select('*')
      .eq('id', demoRequest.id)
      .single();

    if (checkError) throw checkError;
    console.log('✅ Demo request status:', updatedRequest.status);
    console.log('📅 Account created at:', updatedRequest.account_created_at);

    console.log('\n🎉 All tests passed! Demo account system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDemoAccountCreation();