require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('\n=== ERSTELLE 12 FEHLENDE BOXEN ===\n');

  // SCHRITT 1: Erstelle QR-Codes
  console.log('📝 Schritt 1: Erstelle QR-Codes in qr_codes Tabelle...');
  
  const qrCodes = [];
  for (let i = 196; i <= 207; i++) {
    const qrCode = `DSE-${String(i).padStart(4, '0')}`;
    qrCodes.push({
      id: qrCode,  // id ist der QR-Code
      organisation_id: 3,
      assigned: false
    });
  }

  const { data: qrData, error: qrError } = await supabase
    .from('qr_codes')
    .insert(qrCodes)
    .select('id');

  if (qrError) {
    console.error('❌ Fehler beim Erstellen der QR-Codes:', qrError);
    return;
  }

  console.log(`✅ ${qrData.length} QR-Codes erstellt`);

  // SCHRITT 2: Erstelle Boxen
  console.log('\n📦 Schritt 2: Erstelle Boxen...');
  
  const missingBoxes = [];
  for (let i = 196; i <= 207; i++) {
    const qrCode = `DSE-${String(i).padStart(4, '0')}`;
    const boxNumber = i; // Die Nummer ohne DSE-Präfix
    
    missingBoxes.push({
      qr_code: qrCode,
      organisation_id: 3,
      object_id: null,
      status: 'active',
      position_type: null,
      box_type_id: null,
      number: boxNumber,
      display_number: boxNumber.toString(),
      current_status: 'green',
      lat: null,
      lng: null,
      floor_plan_id: null,
      pos_x: null,
      pos_y: null,
      grid_position: null,
      layout_id: null,
      box_name: null
    });
  }

  console.log(`   Erstelle ${missingBoxes.length} Boxen:`);
  missingBoxes.forEach(b => console.log(`   - ${b.qr_code}`));

  const { data, error } = await supabase
    .from('boxes')
    .insert(missingBoxes)
    .select('id, qr_code');

  if (error) {
    console.error('\n❌ Fehler beim Erstellen der Boxen:', error);
    return;
  }

  console.log(`\n✅ ${data.length} Boxen erfolgreich erstellt!`);
  
  // SCHRITT 3: Prüfe Gesamtanzahl
  const { data: allBoxes } = await supabase
    .from('boxes')
    .select('id')
    .eq('organisation_id', 3);

  console.log(`\n📊 Gesamtanzahl Boxen in Org 3: ${allBoxes?.length || 0}`);
  console.log(`   Sollte sein: 100`);
  console.log(`   Status: ${allBoxes?.length === 100 ? '✅ VOLLSTÄNDIG!' : '⚠️ Noch nicht vollständig'}`);
})();
