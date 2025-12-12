// ============================================
// BOX NAME UTILITIES
// Formatiert Box-Namen für Anzeige
// sew-0023 → 23, sew-1202 → 1202, sew-0123 → 123
// ============================================

/**
 * Extrahiert die Kurzform aus einem QR-Code
 * @param {string} qrCode - z.B. "sew-0023"
 * @returns {string} - z.B. "23"
 */
export function getShortBoxNumber(qrCode) {
  if (!qrCode) return "?";
  
  // Extrahiere den Nummernteil (nach dem letzten Bindestrich)
  const parts = qrCode.split("-");
  const numberPart = parts[parts.length - 1];
  
  // Entferne führende Nullen
  const shortNumber = parseInt(numberPart, 10);
  
  // Falls keine gültige Zahl, gib original zurück
  if (isNaN(shortNumber)) {
    return qrCode;
  }
  
  return String(shortNumber);
}

/**
 * Formatiert Box-Anzeigename
 * Nutzt box.number wenn vorhanden, sonst QR-Code kürzen
 * @param {Object} box - Box-Objekt mit qr_code und/oder number
 * @returns {string} - Kurzer Anzeigename
 */
export function formatBoxName(box) {
  if (!box) return "?";
  
  // Wenn number direkt vorhanden ist, nutze das
  if (box.number != null) {
    return String(box.number);
  }
  
  // Sonst aus QR-Code extrahieren
  if (box.qr_code) {
    return getShortBoxNumber(box.qr_code);
  }
  
  // Fallback auf name oder id
  return box.name || box.id || "?";
}

/**
 * Formatiert Box mit Typ-Info
 * @param {Object} box - Box-Objekt
 * @returns {string} - z.B. "23 (Mausbox)"
 */
export function formatBoxWithType(box) {
  const number = formatBoxName(box);
  const typeName = box.box_types?.name || box.boxType?.name;
  
  if (typeName) {
    return `${number} (${typeName})`;
  }
  
  return number;
}

/**
 * Formatiert Box für Tabellen/Listen
 * @param {Object} box - Box-Objekt
 * @returns {Object} - { number, display, type }
 */
export function formatBoxForDisplay(box) {
  return {
    number: formatBoxName(box),
    display: formatBoxWithType(box),
    type: box.box_types?.name || box.boxType?.name || null,
    qrCode: box.qr_code,
    fullName: box.qr_code || `Box ${formatBoxName(box)}`
  };
}

// Default export für einfachen Import
export default {
  getShortBoxNumber,
  formatBoxName,
  formatBoxWithType,
  formatBoxForDisplay
};