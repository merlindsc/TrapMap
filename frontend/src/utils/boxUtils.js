// ============================================
// BOX UTILS - Display-Helper für Box-Labels
// ============================================

/**
 * Erstellt vollständiges Box-Label: {short_code}-{number} {box_name}
 * @param {Object} box - Box-Objekt mit short_code, number/display_number, box_name
 * @param {boolean} includeQR - Optional: QR-Code am Ende anhängen
 * @returns {string} - Formatiertes Label, z.B. "RK-12 Eingang" oder "RK-12 Eingang (TM-ABC123)"
 */
export function getBoxLabel(box, includeQR = false) {
  const prefix = box.short_code || 'XX';
  const num = box.number || box.display_number || '?';
  const name = box.box_name ? ` ${box.box_name}` : '';
  
  let label = `${prefix}-${num}${name}`;
  
  if (includeQR && box.qr_code) {
    label += ` (${box.qr_code})`;
  }
  
  return label;
}

/**
 * Erstellt Kurz-Label nur für Marker: {short_code}-{number}
 * @param {Object} box - Box-Objekt mit short_code, number/display_number
 * @returns {string} - Kurzes Label, z.B. "RK-12"
 */
export function getBoxShortLabel(box) {
  const prefix = box.short_code || 'XX';
  const num = box.number || box.display_number || '?';
  return `${prefix}-${num}`;
}

/**
 * Erstellt Box-Label mit Type-Name (fallback wenn short_code fehlt)
 * @param {Object} box - Box-Objekt mit short_code/box_type_name, number, box_name
 * @returns {string} - Label mit Type-Name oder Kürzel
 */
export function getBoxLabelWithType(box) {
  const typeDisplay = box.short_code || box.box_type_name || 'Box';
  const num = box.number || box.display_number || '?';
  const name = box.box_name ? ` ${box.box_name}` : '';
  return `${typeDisplay}-${num}${name}`;
}
