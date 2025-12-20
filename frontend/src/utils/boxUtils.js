// ============================================
// BOX UTILS - Display-Helper für Box-Labels
// ============================================

/**
 * Extrahiert die Nummer aus dem QR-Code ohne führende Nullen
 * z.B. "TM-00000123" → "123", "DSE-0096" → "96"
 * @param {string} qrCode - QR-Code String
 * @returns {string} - Nummer ohne führende Nullen
 */
export function extractQrNumber(qrCode) {
  if (!qrCode) return null;
  const match = qrCode.match(/(\d+)/);
  return match ? parseInt(match[1], 10).toString() : null;
}

/**
 * Holt die anzuzeigende Box-Nummer
 * Priorität: 1. Zahlen aus QR-Code, 2. display_number, 3. number
 * @param {Object} box - Box-Objekt
 * @returns {string} - Nummer für Anzeige
 */
export function getBoxNumber(box) {
  // Primär: Zahlen aus QR-Code extrahieren
  if (box.qr_code) {
    const qrNum = extractQrNumber(box.qr_code);
    if (qrNum) return qrNum;
  }
  // Fallback: display_number oder number
  return box.display_number || box.number || '?';
}

/**
 * Erstellt vollständiges Box-Label: {short_code}{number} {box_name}
 * @param {Object} box - Box-Objekt mit short_code, qr_code, number/display_number, box_name
 * @param {boolean} includeQR - Optional: QR-Code am Ende anhängen
 * @returns {string} - Formatiertes Label, z.B. "RK12 Eingang" oder "RK12 Eingang (TM-ABC123)"
 */
export function getBoxLabel(box, includeQR = false) {
  const prefix = box.short_code || 'XX';
  const num = getBoxNumber(box);
  const name = box.box_name ? ` ${box.box_name}` : '';
  
  let label = `${prefix}${num}${name}`;
  
  if (includeQR && box.qr_code) {
    label += ` (${box.qr_code})`;
  }
  
  return label;
}

/**
 * Erstellt Kurz-Label nur für Marker: {short_code}{number}
 * z.B. "RK123" für Rodent Station mit QR-Code TM-00000123
 * @param {Object} box - Box-Objekt mit short_code, qr_code
 * @returns {string} - Kurzes Label, z.B. "RK123"
 */
export function getBoxShortLabel(box) {
  const prefix = box.short_code || 'XX';
  const num = getBoxNumber(box);
  return `${prefix}${num}`;
}

/**
 * Erstellt Box-Label mit Type-Name (fallback wenn short_code fehlt)
 * @param {Object} box - Box-Objekt mit short_code/box_type_name, qr_code, number, box_name
 * @returns {string} - Label mit Type-Name oder Kürzel
 */
export function getBoxLabelWithType(box) {
  const typeDisplay = box.short_code || box.box_type_name || 'Box';
  const num = getBoxNumber(box);
  const name = box.box_name ? ` ${box.box_name}` : '';
  return `${typeDisplay}${num}${name}`;
}

/**
 * Validates if a string looks like a valid QR code
 * QR codes typically follow patterns like "TM-123456", "DSE-0096", etc.
 * @param {string} str - String to validate
 * @returns {boolean} - True if looks like a valid QR code
 */
export function isValidQrCode(str) {
  if (!str || typeof str !== 'string') return false;
  // QR codes should have at least 3 characters and contain both letters and numbers
  // Allows alphanumeric characters and dashes
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9-]{3,}$/.test(str);
}

/**
 * Extracts QR code from a pool box object (from /boxes/pool endpoint)
 * Expects flat box structure with direct qr_code property
 * @param {Object} box - Box object from API
 * @returns {string|null} - Extracted QR code or null if not found
 */
export function extractQrCodeFromPoolBox(box) {
  if (!box) {
    console.warn("⚠️ extractQrCodeFromPoolBox: box is null/undefined");
    return null;
  }
  
  // Primary: Direct qr_code property (from /boxes/pool)
  if (box.qr_code && typeof box.qr_code === 'string' && box.qr_code.trim()) {
    return box.qr_code.trim();
  }
  
  // Legacy fallback: nested structure (from old /qr/codes endpoint)
  if (box.boxes?.qr_code && typeof box.boxes.qr_code === 'string' && box.boxes.qr_code.trim()) {
    console.warn("⚠️ Using nested box structure - should use /boxes/pool endpoint");
    return box.boxes.qr_code.trim();
  }
  
  // Last resort: id might be the QR code in some cases
  if (box.id && typeof box.id === 'string' && box.id.includes('-') && box.id.length >= 5) {
    console.warn("⚠️ Using box.id as QR code - verify data structure");
    return box.id.trim();
  }
  
  console.error("❌ No valid QR code found in box:", { 
    id: box.id, 
    has_qr_code: !!box.qr_code, 
    has_nested: !!box.boxes 
  });
  return null;
}

/**
 * Extracts QR codes from an array of pool box objects
 * Filters out null/invalid values and validates QR codes
 * @param {Array} poolBoxes - Array of box objects from /boxes/pool API
 * @param {number} count - Number of QR codes to extract
 * @returns {Array<string>} - Array of valid QR codes
 */
export function extractQrCodesFromPoolBoxes(poolBoxes, count) {
  if (!Array.isArray(poolBoxes)) {
    console.error("❌ extractQrCodesFromPoolBoxes: poolBoxes is not an array");
    return [];
  }
  
  if (count < 1) {
    console.warn("⚠️ extractQrCodesFromPoolBoxes: count < 1");
    return [];
  }
  
  console.log(`📦 Extracting ${count} QR codes from ${poolBoxes.length} boxes`);
  
  const extracted = poolBoxes
    .slice(0, count)
    .map((box, index) => {
      const qr = extractQrCodeFromPoolBox(box);
      if (!qr) {
        console.warn(`⚠️ Box at index ${index} has no valid QR code:`, box);
      }
      return qr;
    })
    .filter(qr => qr !== null && typeof qr === 'string' && qr.length > 0);
  
  console.log(`✅ Extracted ${extracted.length} valid QR codes:`, extracted.slice(0, 5));
  
  if (extracted.length < count) {
    console.warn(`⚠️ Only extracted ${extracted.length} of ${count} requested QR codes`);
  }
  
  return extracted;
}
