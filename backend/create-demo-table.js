/* ============================================================
   TRAPMAP – CREATE DEMO TABLE SCRIPT
   Manually create demo_requests table
   ============================================================ */

const { supabase } = require('./config/supabase');

async function createDemoTable() {
  console.log('🚀 Creating demo_requests table...');
  
  try {
    // Since we can't create tables directly via Supabase client,
    // we'll simulate the table creation by just testing functionality
    
    console.log('📋 Table Structure needed:');
    console.log('');
    console.log('CREATE TABLE demo_requests (');
    console.log('  id SERIAL PRIMARY KEY,');
    console.log('  name VARCHAR(255) NOT NULL,');
    console.log('  company VARCHAR(255),');
    console.log('  email VARCHAR(255) NOT NULL UNIQUE,');
    console.log('  phone VARCHAR(50),');
    console.log('  expectations TEXT,');
    console.log('  status VARCHAR(50) DEFAULT \'pending\',');
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('  account_created_at TIMESTAMP WITH TIME ZONE,');
    console.log('  organisation_id INTEGER REFERENCES organisations(id),');
    console.log('  user_id INTEGER REFERENCES users(id)');
    console.log(');');
    console.log('');
    console.log('📝 Please execute this SQL in your Supabase SQL editor');
    console.log('🔗 https://app.supabase.com > SQL Editor > New Query');
    console.log('');
    
    // Test if table exists
    const { data, error } = await supabase
      .from('demo_requests')
      .select('count')
      .limit(1);
    
    if (!error) {
      console.log('✅ Table demo_requests already exists!');
      
      // Test insertion
      const testData = {
        name: 'Test User',
        company: 'Test Company',
        email: `test-${Date.now()}@example.com`,
        phone: '+49 123 456789',
        expectations: 'Testing the demo functionality',
      };
      
      const { data: inserted, error: insertError } = await supabase
        .from('demo_requests')
        .insert([testData])
        .select()
        .single();
      
      if (insertError) {
        console.log('❌ Insert test failed:', insertError.message);
      } else {
        console.log('✅ Insert test successful!');
        console.log('   Inserted record ID:', inserted.id);
        
        // Clean up test record
        await supabase
          .from('demo_requests')
          .delete()
          .eq('id', inserted.id);
        console.log('🧹 Test record cleaned up');
      }
      
    } else {
      console.log('❌ Table does not exist. Please create it using the SQL above.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createDemoTable();