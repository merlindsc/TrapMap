/* ============================================================
   TEST DEMO WITH QR CODES AND BOXES
   Tests the complete demo system with QR codes and boxes
   ============================================================ */

const { supabase } = require('./config/supabase');
const demoService = require('./services/demo.service');

async function testDemoWithQRAndBoxes() {
  try {
    console.log('🧪 Testing complete demo system with QR codes and boxes...\n');

    // 1. Create a test demo request
    console.log('1. Creating demo request...');
    const timestamp = Date.now();
    const testRequest = {
      name: 'QR Demo Test',
      company: 'QR Test GmbH',
      email: `qr-demo-${timestamp}@example.com`,
      phone: '+49 987 654321',
      expectations: 'Testing demo with QR codes and boxes'
    };

    const { data: demoRequest, error: requestError } = await supabase
      .from('demo_requests')
      .insert([testRequest])
      .select()
      .single();

    if (requestError) throw requestError;
    console.log('✅ Demo request created with ID:', demoRequest.id);

    // 2. Create demo account with QR codes and boxes
    console.log('\n2. Creating demo account with QR codes and boxes...');
    
    const accountResult = await demoService.createDemoAccount(demoRequest.id, {
      trial_days: 90
    });

    console.log('✅ Demo account created successfully!');
    console.log('📊 Account Details:', {
      organization: {
        id: accountResult.organization.id,
        name: accountResult.organization.name,
        qr_prefix: accountResult.organization.qr_prefix
      },
      user: {
        id: accountResult.user.id,
        email: accountResult.user.email,
        role: accountResult.user.role
      }
    });

    // 3. Verify QR codes were created
    console.log('\n3. Verifying QR codes...');
    const { data: qrCodes, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('organisation_id', accountResult.organization.id);

    if (qrError) throw qrError;
    console.log(`✅ QR codes created: ${qrCodes.length}`);
    if (qrCodes.length > 0) {
      console.log('📄 Sample QR codes:', qrCodes.slice(0, 3).map(qr => qr.code));
    }

    // 4. Verify boxes were created
    console.log('\n4. Verifying boxes...');
    const { data: boxes, error: boxError } = await supabase
      .from('boxes')
      .select('*, box_types(*)')
      .eq('organisation_id', accountResult.organization.id);

    if (boxError) throw boxError;
    console.log(`✅ Boxes created: ${boxes.length}`);
    if (boxes.length > 0) {
      console.log('📦 Sample boxes:', boxes.slice(0, 3).map(box => ({
        number: box.number,
        type: box.box_types?.name,
        status: box.status,
        current_status: box.current_status
      })));
    }

    // 5. Verify box type was created
    console.log('\n5. Verifying box types...');
    const { data: boxTypes, error: boxTypeError } = await supabase
      .from('box_types')
      .select('*')
      .eq('organisation_id', accountResult.organization.id);

    if (boxTypeError) throw boxTypeError;
    console.log(`✅ Box types created: ${boxTypes.length}`);
    if (boxTypes.length > 0) {
      console.log('📋 Box type:', boxTypes[0].name);
    }

    // 6. Check organization counters
    console.log('\n6. Checking organization QR counters...');
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('qr_prefix, qr_next_number, qr_codes_ordered, qr_codes_used')
      .eq('id', accountResult.organization.id)
      .single();

    if (orgError) throw orgError;
    console.log('✅ Organization QR status:', org);

    console.log('\n🎉 COMPLETE DEMO SYSTEM TEST SUCCESSFUL!');
    console.log('\n📊 Summary:');
    console.log(`✅ Organization: ${accountResult.organization.name}`);
    console.log(`✅ QR Prefix: ${org.qr_prefix}`);
    console.log(`✅ QR Codes: ${qrCodes.length} created, ready to use`);
    console.log(`✅ Boxes: ${boxes.length} in storage, ready for deployment`);
    console.log(`✅ Box Type: ${boxTypes[0]?.name} configured`);
    console.log(`✅ User: ${accountResult.user.email} (Admin access)`);

    console.log('\n🚀 Demo user can now:');
    console.log('📱 Scan QR codes to manage locations');
    console.log('📦 Deploy boxes from storage to locations');
    console.log('📊 Track box status and scan history');
    console.log('📈 Generate reports and analytics');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDemoWithQRAndBoxes();