require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('\n=== ERSTELLE KOMPLETTES BOX-SET VON DSE-0001 bis DSE-0210 ===\n');

  // SCHRITT 1: Lösche alle existierenden Boxen und QR-Codes von Org 3
  console.log('🗑️  Schritt 1: Lösche alle existierenden Boxen von Org 3...');
  
  const { error: deleteBoxesError } = await supabase
    .from('boxes')
    .delete()
    .eq('organisation_id', 3);

  if (deleteBoxesError) {
    console.error('❌ Fehler beim Löschen der Boxen:', deleteBoxesError);
    return;
  }

  const { error: deleteQrError } = await supabase
    .from('qr_codes')
    .delete()
    .eq('organisation_id', 3);

  if (deleteQrError) {
    console.error('❌ Fehler beim Löschen der QR-Codes:', deleteQrError);
    return;
  }

  console.log('✅ Alte Boxen und QR-Codes gelöscht');

  // SCHRITT 2: Erstelle 210 neue QR-Codes (DSE-0001 bis DSE-0210)
  console.log('\n📝 Schritt 2: Erstelle 210 QR-Codes (DSE-0001 bis DSE-0210)...');
  
  const qrCodes = [];
  for (let i = 1; i <= 210; i++) {
    const qrCode = `DSE-${String(i).padStart(4, '0')}`;
    qrCodes.push({
      id: qrCode,
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

  console.log(`✅ ${qrData.length} QR-Codes erstellt (DSE-0001 bis DSE-0210)`);

  // SCHRITT 3: Erstelle 210 Boxen
  console.log('\n📦 Schritt 3: Erstelle 210 Boxen...');
  
  const boxes = [];
  for (let i = 1; i <= 210; i++) {
    const qrCode = `DSE-${String(i).padStart(4, '0')}`;
    
    boxes.push({
      qr_code: qrCode,
      organisation_id: 3,
      object_id: null,
      status: 'active',
      position_type: null,
      box_type_id: null,
      number: i,
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

  const { data: boxData, error: boxError } = await supabase
    .from('boxes')
    .insert(boxes)
    .select('id, qr_code');

  if (boxError) {
    console.error('\n❌ Fehler beim Erstellen der Boxen:', boxError);
    return;
  }

  console.log(`✅ ${boxData.length} Boxen erfolgreich erstellt!`);
  
  // SCHRITT 4: Prüfe Ergebnis
  const { data: allBoxes } = await supabase
    .from('boxes')
    .select('id, qr_code')
    .eq('organisation_id', 3)
    .order('number', { ascending: true });

  console.log(`\n📊 ERGEBNIS:`);
  console.log(`   Gesamtanzahl: ${allBoxes?.length || 0} Boxen`);
  console.log(`   Erste Box: ${allBoxes?.[0]?.qr_code || 'N/A'}`);
  console.log(`   Letzte Box: ${allBoxes?.[allBoxes.length - 1]?.qr_code || 'N/A'}`);
  console.log(`   Status: ${allBoxes?.length === 210 ? '✅ VOLLSTÄNDIG!' : '⚠️ Fehler'}`);
  
  console.log('\n🎉 Box-Set DSE-0001 bis DSE-0210 erfolgreich erstellt!');
})();
