/* ============================================================
   DEMO QR & BOXES CREATOR
   Creates initial QR codes and boxes for demo accounts
   ============================================================ */

const { supabase } = require('../config/supabase');

// ============================================
// CREATE DEMO QR CODES AND BOXES
// ============================================
async function createDemoQRCodesAndBoxes(organization, user) {
  const DEMO_QR_COUNT = 20;
  const DEMO_BOX_COUNT = 20;

  try {
    // 1. Create QR codes for the organization
    console.log(`📄 Creating ${DEMO_QR_COUNT} QR codes for demo organization...`);
    
    const qrCodes = [];
    for (let i = 1; i <= DEMO_QR_COUNT; i++) {
      const qrCode = `${organization.qr_prefix}-${String(i).padStart(4, '0')}`;
      qrCodes.push({
        id: qrCode,
        sequence_number: i,
        organisation_id: organization.id,
        printed: false,
        assigned: false,
        created_at: new Date().toISOString()
      });
    }

    const { error: qrError } = await supabase
      .from('qr_codes')
      .insert(qrCodes);

    if (qrError) throw qrError;

    // Update organization QR counter
    const { error: updateOrgError } = await supabase
      .from('organisations')
      .update({ 
        qr_next_number: DEMO_QR_COUNT + 1,
        qr_codes_ordered: DEMO_QR_COUNT,
        qr_codes_used: 0
      })
      .eq('id', organization.id);

    if (updateOrgError) throw updateOrgError;

    // 2. Get or create default box type
    let { data: boxType, error: boxTypeError } = await supabase
      .from('box_types')
      .select('*')
      .eq('organisation_id', organization.id)
      .limit(1)
      .single();

    // If no box type exists, create a default one
    if (boxTypeError && boxTypeError.code === 'PGRST116') {
      const { data: newBoxType, error: createBoxTypeError } = await supabase
        .from('box_types')
        .insert([{
          name: 'Demo Standard Falle',
          category: 'bait_box',
          border_color: '#3B82F6',
          requires_symbol: false,
          organisation_id: organization.id,
          placement_indoor: true,
          placement_outdoor: true,
          weather_resistant: true,
          tamper_resistant: true,
          requires_documentation: false,
          requires_photo: false,
          haccp_relevant: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createBoxTypeError) throw createBoxTypeError;
      boxType = newBoxType;
    } else if (boxTypeError) {
      throw boxTypeError;
    }

    // 3. Create boxes in storage with QR codes assigned
    console.log(`📦 Creating ${DEMO_BOX_COUNT} boxes for demo organization...`);
    
    const boxes = [];
    for (let i = 1; i <= DEMO_BOX_COUNT; i++) {
      const qrCode = `${organization.qr_prefix}-${String(i).padStart(4, '0')}`;
      boxes.push({
        number: i,
        qr_code: qrCode,
        box_name: `DEMO-${String(i).padStart(3, '0')}`,
        box_type_id: boxType.id,
        organisation_id: organization.id,
        current_status: null,
        status: 'active',
        object_id: null,
        position_type: null,
        active: true,
        created_at: new Date().toISOString()
      });
    }

    const { data: createdBoxes, error: boxError } = await supabase
      .from('boxes')
      .insert(boxes)
      .select('id, qr_code');

    if (boxError) throw boxError;

    // 4. Update qr_codes to link them with boxes and mark as assigned
    if (createdBoxes && createdBoxes.length > 0) {
      for (const box of createdBoxes) {
        await supabase
          .from('qr_codes')
          .update({ 
            box_id: box.id, 
            assigned: true 
          })
          .eq('id', box.qr_code);
      }
    }

    console.log(`✅ Successfully created ${DEMO_QR_COUNT} QR codes and ${DEMO_BOX_COUNT} boxes for demo account`);
    
    return {
      qr_codes_created: DEMO_QR_COUNT,
      boxes_created: DEMO_BOX_COUNT,
      qr_prefix: organization.qr_prefix,
      box_type: boxType.name
    };

  } catch (error) {
    console.error('❌ Error creating demo QR codes/boxes:', error);
    throw error;
  }
}

module.exports = {
  createDemoQRCodesAndBoxes
};