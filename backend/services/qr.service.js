/* ============================================================
   TRAPMAP – QR CODE SERVICE (IMPROVED)
   
   FEATURES:
   - Codes gehören IMMER zu einer Organisation
   - Codes können nur Boxen der GLEICHEN Organisation zugewiesen werden
   - Codes können zwischen Objekten verschoben werden
   - Eindeutige Code-Generierung mit Kollisionsprüfung
   ============================================================ */

const { supabase } = require("../config/supabase");
const crypto = require("crypto");

// ============================================
// CODE GENERIERUNG
// ============================================

/**
 * Generiert eindeutigen QR-Code
 * Format: TM-XXXX-XXXX-XXXX (12 Zeichen)
 */
const generateUniqueCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Ohne I,O,0,1 (verwechslungsgefahr)
  let code = 'TM-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
};

/**
 * Generiert mehrere Codes für eine Organisation
 * @param {number} organisation_id - Organisation
 * @param {number} count - Anzahl Codes
 * @param {number|null} object_id - Optional: Direkt einem Objekt zuweisen
 * @returns {Array} Generierte Codes
 */
exports.generateCodes = async (organisation_id, count, object_id = null) => {
  const codes = [];
  const maxAttempts = count * 3; // Für Kollisionsvermeidung
  let attempts = 0;

  while (codes.length < count && attempts < maxAttempts) {
    attempts++;
    const code = generateUniqueCode();

    // Prüfe ob Code bereits existiert
    const { data: existing } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("id", code)
      .maybeSingle();

    if (existing) {
      console.log(`⚠️ Code Kollision: ${code}, generiere neu...`);
      continue;
    }

    // Code in DB speichern
    const insertData = {
      id: code,
      organisation_id: parseInt(organisation_id),
      object_id: object_id ? parseInt(object_id) : null,
      box_id: null,
      assigned: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("qr_codes")
      .insert(insertData);

    if (error) {
      console.error(`❌ Fehler beim Speichern von ${code}:`, error.message);
      continue;
    }

    codes.push(code);
  }

  if (codes.length < count) {
    console.warn(`⚠️ Nur ${codes.length} von ${count} Codes generiert`);
  }

  return codes;
};

// ============================================
// CODE PRÜFEN
// ============================================

/**
 * Prüft einen QR-Code
 * @param {string} code - Der Code
 * @returns {Object|null} Code-Daten oder null
 */
exports.checkCode = async (code) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select(`
      id,
      organisation_id,
      object_id,
      box_id,
      assigned,
      assigned_at,
      created_at,
      boxes:box_id (
        id,
        number,
        object_id,
        objects:object_id (
          id,
          name
        )
      ),
      objects:object_id (
        id,
        name
      ),
      organisations:organisation_id (
        id,
        name
      )
    `)
    .eq("id", code.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error("Code check error:", error);
    return null;
  }

  return data;
};

/**
 * Prüft ob Code zu einer Organisation gehört
 */
exports.validateCodeOwnership = async (code, organisation_id) => {
  const { data } = await supabase
    .from("qr_codes")
    .select("id, organisation_id")
    .eq("id", code.toUpperCase())
    .eq("organisation_id", parseInt(organisation_id))
    .maybeSingle();

  return !!data;
};

// ============================================
// CODE EINER BOX ZUWEISEN
// ============================================

/**
 * Weist einen Code einer Box zu
 * WICHTIG: Prüft ob Box zur gleichen Organisation gehört!
 * 
 * @param {string} code - QR-Code
 * @param {number} box_id - Box ID
 * @param {number} organisation_id - Organisation (zur Validierung)
 */
exports.assignCode = async (code, box_id, organisation_id) => {
  const upperCode = code.toUpperCase();

  // 1. Prüfe ob Code existiert und zur Organisation gehört
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("id, organisation_id, assigned, box_id")
    .eq("id", upperCode)
    .maybeSingle();

  if (!qrCode) {
    throw new Error("QR-Code nicht gefunden");
  }

  if (qrCode.organisation_id !== parseInt(organisation_id)) {
    throw new Error("QR-Code gehört nicht zu dieser Organisation");
  }

  if (qrCode.assigned && qrCode.box_id) {
    throw new Error(`QR-Code ist bereits Box ${qrCode.box_id} zugewiesen`);
  }

  // 2. Prüfe ob Box existiert und zur Organisation gehört
  const { data: box } = await supabase
    .from("boxes")
    .select("id, organisation_id, object_id, qr_code")
    .eq("id", parseInt(box_id))
    .maybeSingle();

  if (!box) {
    throw new Error("Box nicht gefunden");
  }

  if (box.organisation_id !== parseInt(organisation_id)) {
    throw new Error("Box gehört nicht zu dieser Organisation");
  }

  if (box.qr_code) {
    throw new Error(`Box hat bereits QR-Code: ${box.qr_code}`);
  }

  // 3. Zuweisung durchführen (Transaktion simulieren)
  
  // QR-Code updaten
  const { error: qrError } = await supabase
    .from("qr_codes")
    .update({
      box_id: parseInt(box_id),
      object_id: box.object_id,
      assigned: true,
      assigned_at: new Date().toISOString()
    })
    .eq("id", upperCode);

  if (qrError) {
    throw new Error("Fehler beim Zuweisen des Codes: " + qrError.message);
  }

  // Box updaten
  const { error: boxError } = await supabase
    .from("boxes")
    .update({
      qr_code: upperCode,
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(box_id));

  if (boxError) {
    // Rollback QR-Code
    await supabase
      .from("qr_codes")
      .update({ box_id: null, assigned: false, assigned_at: null })
      .eq("id", upperCode);
    
    throw new Error("Fehler beim Aktualisieren der Box: " + boxError.message);
  }

  return { success: true, code: upperCode, box_id };
};

// ============================================
// CODE VON BOX ENTFERNEN
// ============================================

/**
 * Entfernt Zuweisung eines Codes (Code bleibt bei Organisation)
 */
exports.unassignCode = async (code, organisation_id) => {
  const upperCode = code.toUpperCase();

  // Prüfe Code
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("id, organisation_id, box_id")
    .eq("id", upperCode)
    .maybeSingle();

  if (!qrCode) {
    throw new Error("QR-Code nicht gefunden");
  }

  if (qrCode.organisation_id !== parseInt(organisation_id)) {
    throw new Error("QR-Code gehört nicht zu dieser Organisation");
  }

  if (!qrCode.box_id) {
    throw new Error("QR-Code ist keiner Box zugewiesen");
  }

  // Box updaten
  await supabase
    .from("boxes")
    .update({ qr_code: null, updated_at: new Date().toISOString() })
    .eq("id", qrCode.box_id);

  // QR-Code updaten (bleibt bei Organisation!)
  await supabase
    .from("qr_codes")
    .update({
      box_id: null,
      object_id: null,
      assigned: false,
      assigned_at: null
    })
    .eq("id", upperCode);

  return { success: true };
};

// ============================================
// CODE EINEM OBJEKT ZUWEISEN (ohne Box)
// ============================================

/**
 * Weist einen Code einem Objekt zu (für spätere Box-Zuweisung)
 */
exports.assignCodeToObject = async (code, object_id, organisation_id) => {
  const upperCode = code.toUpperCase();

  // Prüfe Code
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("id, organisation_id, assigned")
    .eq("id", upperCode)
    .maybeSingle();

  if (!qrCode) {
    throw new Error("QR-Code nicht gefunden");
  }

  if (qrCode.organisation_id !== parseInt(organisation_id)) {
    throw new Error("QR-Code gehört nicht zu dieser Organisation");
  }

  if (qrCode.assigned) {
    throw new Error("QR-Code ist bereits zugewiesen");
  }

  // Prüfe Objekt
  const { data: object } = await supabase
    .from("objects")
    .select("id, organisation_id")
    .eq("id", parseInt(object_id))
    .maybeSingle();

  if (!object) {
    throw new Error("Objekt nicht gefunden");
  }

  if (object.organisation_id !== parseInt(organisation_id)) {
    throw new Error("Objekt gehört nicht zu dieser Organisation");
  }

  // Zuweisung
  const { error } = await supabase
    .from("qr_codes")
    .update({
      object_id: parseInt(object_id)
    })
    .eq("id", upperCode);

  if (error) {
    throw new Error("Fehler: " + error.message);
  }

  return { success: true };
};

// ============================================
// ALLE CODES EINER ORGANISATION
// ============================================

exports.getCodesByOrganisation = async (organisation_id) => {
  const { data, error } = await supabase
    .from("qr_codes")
    .select(`
      id,
      object_id,
      box_id,
      assigned,
      assigned_at,
      created_at,
      boxes:box_id (
        id,
        number
      ),
      objects:object_id (
        id,
        name
      )
    `)
    .eq("organisation_id", parseInt(organisation_id))
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

// ============================================
// FREIE CODES (nicht zugewiesen)
// ============================================

exports.getAvailableCodes = async (organisation_id, object_id = null) => {
  let query = supabase
    .from("qr_codes")
    .select("id, object_id, created_at")
    .eq("organisation_id", parseInt(organisation_id))
    .eq("assigned", false);

  if (object_id) {
    // Codes die diesem Objekt oder keinem Objekt zugewiesen sind
    query = query.or(`object_id.eq.${object_id},object_id.is.null`);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

// ============================================
// BOX MIT CODE ZU ANDEREM OBJEKT VERSCHIEBEN
// ============================================

/**
 * Verschiebt eine Box (inkl. QR-Code) zu einem anderen Objekt
 * WICHTIG: Nur innerhalb der gleichen Organisation!
 * 
 * @param {number} box_id - Box ID
 * @param {number} new_object_id - Neues Objekt
 * @param {number} organisation_id - Organisation (zur Validierung)
 */
exports.moveBoxToObject = async (box_id, new_object_id, organisation_id) => {
  // 1. Prüfe ob Box existiert und zur Organisation gehört
  const { data: box } = await supabase
    .from("boxes")
    .select("id, organisation_id, object_id, qr_code")
    .eq("id", parseInt(box_id))
    .maybeSingle();

  if (!box) {
    throw new Error("Box nicht gefunden");
  }

  if (box.organisation_id !== parseInt(organisation_id)) {
    throw new Error("Box gehört nicht zu dieser Organisation");
  }

  if (box.object_id === parseInt(new_object_id)) {
    throw new Error("Box ist bereits diesem Objekt zugewiesen");
  }

  // 2. Prüfe ob neues Objekt existiert und zur GLEICHEN Organisation gehört
  const { data: newObject } = await supabase
    .from("objects")
    .select("id, organisation_id, name")
    .eq("id", parseInt(new_object_id))
    .maybeSingle();

  if (!newObject) {
    throw new Error("Ziel-Objekt nicht gefunden");
  }

  if (newObject.organisation_id !== parseInt(organisation_id)) {
    throw new Error("Ziel-Objekt gehört nicht zu dieser Organisation");
  }

  // 3. Box verschieben
  const { error: boxError } = await supabase
    .from("boxes")
    .update({
      object_id: parseInt(new_object_id),
      updated_at: new Date().toISOString()
    })
    .eq("id", parseInt(box_id));

  if (boxError) {
    throw new Error("Fehler beim Verschieben der Box: " + boxError.message);
  }

  // 4. QR-Code updaten (falls vorhanden)
  if (box.qr_code) {
    const { error: qrError } = await supabase
      .from("qr_codes")
      .update({
        object_id: parseInt(new_object_id)
      })
      .eq("id", box.qr_code);

    if (qrError) {
      console.error("QR-Code Update Fehler:", qrError);
      // Kein Rollback nötig - Box ist verschoben, Code zeigt nur auf anderes Objekt
    }
  }

  return { 
    success: true, 
    message: `Box zu "${newObject.name}" verschoben`,
    box_id,
    new_object_id,
    qr_code: box.qr_code
  };
};

// ============================================
// CODE LÖSCHEN (nur unzugewiesene!)
// ============================================

exports.deleteCode = async (code, organisation_id) => {
  const upperCode = code.toUpperCase();

  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("id, assigned")
    .eq("id", upperCode)
    .eq("organisation_id", parseInt(organisation_id))
    .maybeSingle();

  if (!qrCode) {
    throw new Error("QR-Code nicht gefunden");
  }

  if (qrCode.assigned) {
    throw new Error("Zugewiesene Codes können nicht gelöscht werden");
  }

  const { error } = await supabase
    .from("qr_codes")
    .delete()
    .eq("id", upperCode);

  if (error) throw new Error(error.message);
  return { success: true };
};

// ============================================
// SCAN VIA QR CODE
// ============================================

exports.scanByCode = async (code) => {
  const upperCode = code.toUpperCase();

  const { data, error } = await supabase
    .from("qr_codes")
    .select(`
      id,
      box_id,
      organisation_id,
      assigned,
      boxes:box_id (
        id,
        number,
        current_status,
        object_id,
        lat,
        lng,
        notes,
        box_types:box_type_id (
          id,
          name,
          category
        ),
        objects:object_id (
          id,
          name,
          address,
          city
        )
      )
    `)
    .eq("id", upperCode)
    .maybeSingle();

  if (error) throw new Error(error.message);
  
  if (!data) {
    return { found: false, message: "QR-Code nicht registriert" };
  }

  if (!data.assigned || !data.box_id) {
    return { 
      found: true, 
      assigned: false, 
      code: data.id,
      organisation_id: data.organisation_id,
      message: "QR-Code noch nicht zugewiesen" 
    };
  }

  return {
    found: true,
    assigned: true,
    code: data.id,
    box: data.boxes,
    organisation_id: data.organisation_id
  };
};