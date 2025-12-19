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
