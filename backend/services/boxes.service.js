/* ============================================================
   TRAPMAP – BOXES SERVICE ERWEITERUNG
   
   Zusätzliche Funktionen für Box-Management:
   - Box zu anderem Objekt verschieben (mit QR-Code)
   - QR-Code einer Box zuweisen
   - QR-Code von Box entfernen
   
   Diese Funktionen zu boxes_service.js hinzufügen!
   ============================================================ */

const { supabase } = require("../config/supabase");

// ============================================
// BOX ZU ANDEREM OBJEKT VERSCHIEBEN
// ============================================
exports.moveToObject = async (boxId, newObjectId, organisationId) => {
  // 1. Box laden und prüfen
  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id, organisation_id, object_id, qr_code, number")
    .eq("id", parseInt(boxId))
    .eq("organisation_id", parseInt(organisationId))
    .single();

  if (boxError || !box) {
    return { success: false, message: "Box nicht gefunden" };
  }

  if (box.object_id === parseInt(newObjectId)) {
    return { success: false, message: "Box ist bereits diesem Objekt zugewiesen" };
  }

  // 2. Neues Objekt prüfen (muss zur gleichen Org gehören!)
  const { data: newObject, error: objError } = await supabase
    .from("objects")
    .select("id, organisation_id, name")
    .eq("id", parseInt(newObjectId))
    .eq("organisation_id", parseInt(organisationId))
    .single();

  if (objError || !newObject) {
    return { success: false, message: "Ziel-Objekt nicht gefunden oder gehört nicht zur Organisation" };
  }

  // 3. Box verschieben
  const { error: updateError } = await supabase
    .from("boxes")
    .update({
      object_id: parseInt(newObjectId),
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(boxId));

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  // 4. QR-Code auch updaten (falls vorhanden)
  if (box.qr_code) {
    await supabase
      .from("qr_codes")
      .update({ object_id: parseInt(newObjectId) })
      .eq("id", box.qr_code);
  }

  console.log(`✅ Box ${box.number} verschoben zu Objekt: ${newObject.name}`);

  return { 
    success: true, 
    data: {
      box_id: boxId,
      box_number: box.number,
      old_object_id: box.object_id,
      new_object_id: newObjectId,
      new_object_name: newObject.name,
      qr_code: box.qr_code
    }
  };
};

// ============================================
// QR-CODE EINER BOX ZUWEISEN
// ============================================
exports.assignQrCode = async (boxId, qrCode, organisationId) => {
  const upperCode = qrCode.toUpperCase();

  // 1. Box laden
  const { data: box } = await supabase
    .from("boxes")
    .select("id, organisation_id, object_id, qr_code")
    .eq("id", parseInt(boxId))
    .eq("organisation_id", parseInt(organisationId))
    .single();

  if (!box) {
    return { success: false, message: "Box nicht gefunden" };
  }

  if (box.qr_code) {
    return { success: false, message: `Box hat bereits QR-Code: ${box.qr_code}` };
  }

  // 2. QR-Code prüfen
  const { data: code } = await supabase
    .from("qr_codes")
    .select("id, organisation_id, assigned, box_id")
    .eq("id", upperCode)
    .single();

  if (!code) {
    return { success: false, message: "QR-Code nicht gefunden" };
  }

  if (code.organisation_id !== parseInt(organisationId)) {
    return { success: false, message: "QR-Code gehört nicht zu dieser Organisation" };
  }

  if (code.assigned && code.box_id) {
    return { success: false, message: "QR-Code ist bereits einer anderen Box zugewiesen" };
  }

  // 3. Zuweisung durchführen
  // QR-Code updaten
  const { error: qrError } = await supabase
    .from("qr_codes")
    .update({
      box_id: parseInt(boxId),
      object_id: box.object_id,
      assigned: true,
      assigned_at: new Date().toISOString()
    })
    .eq("id", upperCode);

  if (qrError) {
    return { success: false, message: qrError.message };
  }

  // Box updaten
  const { error: boxError } = await supabase
    .from("boxes")
    .update({
      qr_code: upperCode,
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(boxId));

  if (boxError) {
    // Rollback QR-Code
    await supabase
      .from("qr_codes")
      .update({ box_id: null, assigned: false, assigned_at: null })
      .eq("id", upperCode);
    return { success: false, message: boxError.message };
  }

  console.log(`✅ QR-Code ${upperCode} zugewiesen an Box ${boxId}`);

  return { success: true, data: { box_id: boxId, qr_code: upperCode } };
};

// ============================================
// QR-CODE VON BOX ENTFERNEN
// ============================================
exports.removeQrCode = async (boxId, organisationId) => {
  // Box laden
  const { data: box } = await supabase
    .from("boxes")
    .select("id, qr_code")
    .eq("id", parseInt(boxId))
    .eq("organisation_id", parseInt(organisationId))
    .single();

  if (!box) {
    return { success: false, message: "Box nicht gefunden" };
  }

  if (!box.qr_code) {
    return { success: false, message: "Box hat keinen QR-Code" };
  }

  const qrCode = box.qr_code;

  // QR-Code freigeben (bleibt bei Organisation!)
  await supabase
    .from("qr_codes")
    .update({
      box_id: null,
      object_id: null,
      assigned: false,
      assigned_at: null
    })
    .eq("id", qrCode);

  // Box updaten
  await supabase
    .from("boxes")
    .update({
      qr_code: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(boxId));

  console.log(`✅ QR-Code ${qrCode} von Box ${boxId} entfernt`);

  return { success: true, data: { box_id: boxId, removed_code: qrCode } };
};

// ============================================
// BULK: MEHRERE BOXEN VERSCHIEBEN
// ============================================
exports.bulkMoveToObject = async (boxIds, newObjectId, organisationId) => {
  const results = {
    success: [],
    failed: []
  };

  for (const boxId of boxIds) {
    const result = await exports.moveToObject(boxId, newObjectId, organisationId);
    if (result.success) {
      results.success.push(boxId);
    } else {
      results.failed.push({ boxId, error: result.message });
    }
  }

  return {
    success: results.failed.length === 0,
    moved: results.success.length,
    failed: results.failed.length,
    details: results
  };
};

// ============================================
// BOX MIT NEUEM CODE ERSTELLEN
// ============================================
exports.createWithQrCode = async (organisationId, payload, qrCode = null) => {
  // Erst Box erstellen (nutze bestehende create Funktion)
  const boxResult = await exports.create(organisationId, payload);
  
  if (!boxResult.success) {
    return boxResult;
  }

  const box = boxResult.data;

  // Wenn QR-Code angegeben, zuweisen
  if (qrCode) {
    const assignResult = await exports.assignQrCode(box.id, qrCode, organisationId);
    if (!assignResult.success) {
      console.warn(`Box erstellt, aber QR-Code Zuweisung fehlgeschlagen: ${assignResult.message}`);
      return {
        success: true,
        data: box,
        warning: `QR-Code konnte nicht zugewiesen werden: ${assignResult.message}`
      };
    }
    box.qr_code = qrCode.toUpperCase();
  }

  return { success: true, data: box };
};