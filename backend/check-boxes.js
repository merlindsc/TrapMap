require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  console.log('\n=== SUCHE NACH 12 FEHLENDEN BOXEN ===\n');

  // 1. ALLE Boxen in ALLEN Organisationen (um zu sehen ob sie woanders sind)
  const { data: allBoxesEverywhere } = await supabase
    .from('boxes')
    .select('id, qr_code, organisation_id, object_id, status')
    .or('qr_code.like.DSE-01%,qr_code.like.DSE-00%');

  console.log(`🔍 Boxen mit DSE-Präfix (alle Orgs): ${allBoxesEverywhere?.length || 0}`);
  
  // Gruppiere nach Organisation
  const byOrg = {};
  allBoxesEverywhere?.forEach(b => {
    byOrg[b.organisation_id] = byOrg[b.organisation_id] || [];
    byOrg[b.organisation_id].push(b);
  });
  
  console.log('\nBoxen pro Organisation:');
  Object.keys(byOrg).forEach(orgId => {
    console.log(`  Org ${orgId}: ${byOrg[orgId].length} Boxen`);
  });

  // 2. Prüfe welche QR-Codes aus dem Bereich DSE-0108 bis DSE-0207 fehlen
  console.log('\n=== FEHLENDE QR-CODES ===\n');
  
  const { data: org3Boxes } = await supabase
    .from('boxes')
    .select('qr_code')
    .eq('organisation_id', 3);

  const existingCodes = new Set(org3Boxes?.map(b => b.qr_code) || []);
  
  const missingCodes = [];
  // Prüfe DSE-0108 bis DSE-0207 (100 Boxen)
  for (let i = 108; i <= 207; i++) {
    const code = `DSE-${String(i).padStart(4, '0')}`;
    if (!existingCodes.has(code)) {
      missingCodes.push(code);
    }
  }
  
  console.log(`❌ Fehlende QR-Codes in Org 3: ${missingCodes.length}`);
  if (missingCodes.length > 0) {
    console.log('\nFehlende Codes:');
    missingCodes.forEach(code => console.log(`  - ${code}`));
  }

  // 3. Prüfe ob diese Codes in anderen Organisationen sind
  if (missingCodes.length > 0) {
    const { data: codesElsewhere } = await supabase
      .from('boxes')
      .select('qr_code, organisation_id, object_id, status')
      .in('qr_code', missingCodes);
    
    if (codesElsewhere && codesElsewhere.length > 0) {
      console.log(`\n🔍 ${codesElsewhere.length} der fehlenden Codes in anderen Orgs gefunden:`);
      codesElsewhere.forEach(b => {
        console.log(`  - ${b.qr_code} → Org ${b.organisation_id} (object: ${b.object_id}, status: ${b.status})`);
      });
    } else {
      console.log('\n💀 Diese Codes existieren NIRGENDWO in der Datenbank - sie wurden gelöscht!');
    }
  }

  // 4. Zähle Boxen in Org 3
  const { data: org3BoxesAll } = await supabase
    .from('boxes')
    .select('id, qr_code, object_id, status')
    .eq('organisation_id', 3);

  console.log(`\n=== ORG 3 STATUS ===`);
  console.log(`Total Boxen: ${org3BoxesAll?.length || 0}`);
  console.log(`Sollte sein: 100 (DSE-0108 bis DSE-0207)`);
  console.log(`Differenz: ${100 - (org3BoxesAll?.length || 0)} Boxen fehlen`);
})();
