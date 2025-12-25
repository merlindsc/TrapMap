// ============================================
// FIX: QR-CODES MIT BOXEN VERKNÜPFEN
// Problem: boxes.qr_code ist gesetzt, aber qr_codes.box_id ist NULL
// Lösung: Alle Boxen durchgehen und qr_codes.box_id aktualisieren
// ============================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixQRBoxLinks() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  QR-CODE <-> BOX VERKNÜPFUNG FIXEN  ║');
  console.log('╚══════════════════════════════════════╝\n');

  try {
    // 1. ALLE BOXEN MIT QR-CODE LADEN
    console.log('📦 Lade alle Boxen mit QR-Codes...');
    const { data: boxes, error: boxError } = await supabase
      .from('boxes')
      .select('id, qr_code, organisation_id, status')
      .not('qr_code', 'is', null);

    if (boxError) throw boxError;
    console.log(`✅ ${boxes.length} Boxen mit QR-Codes gefunden\n`);

    // 2. QR-CODES ÜBERPRÜFEN
    console.log('🔍 Prüfe qr_codes Tabelle...');
    let fixed = 0;
    let alreadyLinked = 0;
    let notFound = 0;

    for (const box of boxes) {
      // Prüfe ob QR-Code existiert
      const { data: qrCode, error: qrError } = await supabase
        .from('qr_codes')
        .select('id, box_id, assigned')
        .eq('id', box.qr_code)
        .maybeSingle();

      if (qrError) {
        console.error(`❌ Fehler bei ${box.qr_code}:`, qrError.message);
        continue;
      }

      // QR-Code existiert nicht
      if (!qrCode) {
        notFound++;
        console.log(`⚠️  QR-Code ${box.qr_code} nicht in qr_codes Tabelle (Box ${box.id})`);
        
        // ERSTELLE QR-CODE EINTRAG
        const { error: insertError } = await supabase
          .from('qr_codes')
          .insert({
            id: box.qr_code,
            organisation_id: box.organisation_id,
            box_id: box.id,
            assigned: true,
            assigned_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Fehler beim Erstellen von ${box.qr_code}:`, insertError.message);
        } else {
          fixed++;
          console.log(`   ✅ QR-Code ${box.qr_code} erstellt und mit Box ${box.id} verknüpft`);
        }
        continue;
      }

      // QR-Code hat bereits richtige box_id
      if (qrCode.box_id === box.id) {
        alreadyLinked++;
        continue;
      }

      // QR-Code existiert aber box_id fehlt oder ist falsch
      fixed++;
      const { error: updateError } = await supabase
        .from('qr_codes')
        .update({
          box_id: box.id,
          assigned: true,
          assigned_at: new Date().toISOString()
        })
        .eq('id', box.qr_code);

      if (updateError) {
        console.error(`❌ Fehler beim Update von ${box.qr_code}:`, updateError.message);
      } else {
        console.log(`🔧 ${box.qr_code} → Box ${box.id} (vorher: ${qrCode.box_id || 'NULL'})`);
      }
    }

    // 3. ZUSAMMENFASSUNG
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║           ZUSAMMENFASSUNG            ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`✅ Bereits korrekt verknüpft: ${alreadyLinked}`);
    console.log(`🔧 Verknüpfungen gefixt:      ${fixed}`);
    console.log(`⚠️  QR-Codes erstellt:         ${notFound}`);
    console.log(`📦 Gesamt:                    ${boxes.length}\n`);

    // 4. VERIFIKATION
    console.log('🔍 Verifikation...');
    const { data: unlinkedQRs } = await supabase
      .from('qr_codes')
      .select('id, box_id')
      .is('box_id', null);

    console.log(`⚠️  QR-Codes ohne Box-Verknüpfung: ${unlinkedQRs?.length || 0}`);
    
    if (unlinkedQRs && unlinkedQRs.length > 0) {
      console.log('\nQR-Codes ohne Box:');
      unlinkedQRs.slice(0, 10).forEach(qr => {
        console.log(`  - ${qr.id}`);
      });
      if (unlinkedQRs.length > 10) {
        console.log(`  ... und ${unlinkedQRs.length - 10} weitere`);
      }
    }

    console.log('\n✅ Fertig!\n');
  } catch (err) {
    console.error('\n❌ Fehler:', err.message);
    console.error(err);
  }
}

// Ausführen
fixQRBoxLinks();
