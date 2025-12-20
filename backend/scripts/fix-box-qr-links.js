#!/usr/bin/env node

/* ============================================================
   FIX BOX-QR LINKS - Migration Script
   
   Purpose: Link existing boxes without qr_code to their QR codes
   
   This script:
   1. Finds all boxes without qr_code
   2. Matches them with QR codes based on organization and number
   3. Links boxes to their QR codes
   4. Provides detailed logging
   
   Usage:
   node backend/scripts/fix-box-qr-links.js [--dry-run]
   
   Options:
   --dry-run: Show what would be changed without making changes
   ============================================================ */

const { supabase } = require('../config/supabase');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

console.log('============================================================');
console.log('📦 BOX-QR LINK FIXER');
console.log('============================================================');
console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (changes will be applied)'}`);
console.log('');

async function fixBoxQrLinks() {
  try {
    // Step 1: Find all boxes without qr_code
    console.log('Step 1: Finding boxes without qr_code...');
    const { data: boxesWithoutQr, error: boxError } = await supabase
      .from('boxes')
      .select('id, number, box_name, organisation_id, status')
      .is('qr_code', null)
      .neq('status', 'archived');

    if (boxError) {
      console.error('❌ Error fetching boxes:', boxError);
      throw boxError;
    }

    console.log(`✅ Found ${boxesWithoutQr.length} boxes without qr_code`);
    
    if (boxesWithoutQr.length === 0) {
      console.log('✨ All boxes already have QR codes! Nothing to fix.');
      return { success: true, fixed: 0, failed: 0 };
    }

    console.log('');

    // Step 2: Group boxes by organization
    const boxesByOrg = {};
    for (const box of boxesWithoutQr) {
      if (!boxesByOrg[box.organisation_id]) {
        boxesByOrg[box.organisation_id] = [];
      }
      boxesByOrg[box.organisation_id].push(box);
    }

    console.log(`Step 2: Grouped boxes into ${Object.keys(boxesByOrg).length} organization(s)`);
    console.log('');

    // Step 3: Process each organization
    let totalFixed = 0;
    let totalFailed = 0;
    const updates = [];

    for (const [orgId, boxes] of Object.entries(boxesByOrg)) {
      console.log(`\n📂 Processing organization: ${orgId}`);
      console.log(`   Boxes to fix: ${boxes.length}`);

      // Get organization details for QR prefix
      const { data: org, error: orgError } = await supabase
        .from('organisations')
        .select('id, name, qr_prefix')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        console.error(`   ❌ Could not find organization ${orgId}`);
        totalFailed += boxes.length;
        continue;
      }

      console.log(`   Organization: ${org.name} (prefix: ${org.qr_prefix})`);

      // Get all QR codes for this organization
      const { data: qrCodes, error: qrError } = await supabase
        .from('qr_codes')
        .select('id, sequence_number, assigned')
        .eq('organisation_id', orgId);

      if (qrError) {
        console.error(`   ❌ Error fetching QR codes:`, qrError);
        totalFailed += boxes.length;
        continue;
      }

      console.log(`   Available QR codes: ${qrCodes.length}`);

      // Create a map of sequence_number to QR code
      const qrMap = {};
      for (const qr of qrCodes) {
        qrMap[qr.sequence_number] = qr;
      }

      // Match boxes to QR codes
      let orgFixed = 0;
      let orgFailed = 0;

      for (const box of boxes) {
        if (box.number === null || box.number === undefined) {
          console.log(`   ⚠️  Box ${box.id} has no number, skipping`);
          orgFailed++;
          continue;
        }

        const qr = qrMap[box.number];
        if (!qr) {
          console.log(`   ⚠️  Box ${box.id} (number: ${box.number}) - No matching QR code found`);
          orgFailed++;
          continue;
        }

        console.log(`   ✅ Box ${box.id} (number: ${box.number}, name: ${box.box_name || 'N/A'}) → QR: ${qr.id}`);
        
        updates.push({
          boxId: box.id,
          qrCode: qr.id,
          organisationId: orgId
        });
        
        orgFixed++;
      }

      console.log(`   Summary: ${orgFixed} matched, ${orgFailed} failed`);
      totalFixed += orgFixed;
      totalFailed += orgFailed;
    }

    console.log('');
    console.log('============================================================');
    console.log('📊 SUMMARY');
    console.log('============================================================');
    console.log(`Total boxes without QR code: ${boxesWithoutQr.length}`);
    console.log(`Successfully matched: ${totalFixed}`);
    console.log(`Failed to match: ${totalFailed}`);
    console.log('');

    // Step 4: Apply updates if not dry run
    if (updates.length > 0 && !dryRun) {
      console.log('Step 4: Applying updates...');
      
      let successCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        const { error } = await supabase
          .from('boxes')
          .update({ 
            qr_code: update.qrCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.boxId)
          .eq('organisation_id', update.organisationId);

        if (error) {
          console.error(`   ❌ Failed to update box ${update.boxId}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log('');
      console.log(`✅ Successfully updated: ${successCount} boxes`);
      if (errorCount > 0) {
        console.log(`❌ Failed to update: ${errorCount} boxes`);
      }
    } else if (updates.length > 0) {
      console.log('Step 4: Skipped (dry run mode)');
      console.log(`   ${updates.length} updates would be applied`);
    } else {
      console.log('Step 4: No updates to apply');
    }

    console.log('');
    console.log('✨ Done!');
    console.log('============================================================');

    return {
      success: true,
      found: boxesWithoutQr.length,
      matched: totalFixed,
      failed: totalFailed,
      applied: !dryRun ? updates.length : 0
    };

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error);
    console.error('============================================================');
    return { success: false, error: error.message };
  }
}

// Run the script
fixBoxQrLinks()
  .then((result) => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
