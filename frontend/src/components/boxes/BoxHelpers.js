/* ============================================================
   TRAPMAP - BOX HELPERS
   Hilfsfunktionen für display_number und Positions-Logik
   
   Pfad: frontend/src/components/boxes/BoxHelpers.js
   ============================================================ */

/**
 * Berechnet display_number für Boxen eines Objekts
 * Sortiert nach object_assigned_at, dann created_at
 * 
 * @param {Array} boxes - Alle Boxen des Objekts
 * @returns {Array} - Boxen mit display_number
 */
export function calculateDisplayNumbers(boxes) {
  if (!boxes || boxes.length === 0) return [];

  // Sortieren nach Zuweisungsdatum
  const sorted = [...boxes].sort((a, b) => {
    const dateA = new Date(a.object_assigned_at || a.created_at || 0);
    const dateB = new Date(b.object_assigned_at || b.created_at || 0);
    return dateA - dateB;
  });

  // display_number zuweisen (1, 2, 3, ...)
  return sorted.map((box, index) => ({
    ...box,
    display_number: index + 1
  }));
}

/**
 * Holt display_number für eine einzelne Box
 * 
 * @param {Object} box - Die Box
 * @param {Array} allObjectBoxes - Alle Boxen des gleichen Objekts
 * @returns {number|null} - Die display_number oder null
 */
export function getDisplayNumber(box, allObjectBoxes) {
  if (!box?.object_id || !allObjectBoxes) return null;

  const sorted = [...allObjectBoxes]
    .filter(b => b.object_id === box.object_id)
    .sort((a, b) => {
      const dateA = new Date(a.object_assigned_at || a.created_at || 0);
      const dateB = new Date(b.object_assigned_at || b.created_at || 0);
      return dateA - dateB;
    });

  const index = sorted.findIndex(b => b.id === box.id);
  return index >= 0 ? index + 1 : null;
}

/**
 * Extrahiert die kurze QR-Nummer (ohne führende Null)
 * z.B. "CSK-0042" → "42"
 * 
 * @param {Object} box - Die Box
 * @returns {string} - Kurze Nummer
 */
export function getShortQr(box) {
  if (!box?.qr_code) return '?';
  
  // Format: "CSK-0042" → "42"
  const match = box.qr_code.match(/\d+$/);
  if (match) {
    return parseInt(match[0], 10).toString();
  }
  return box.qr_code;
}

/**
 * Prüft ob Box auf GPS platziert ist
 */
export function isGpsBox(box) {
  // position_type === 'gps' ODER 'map' (alte Bezeichnung)
  const isGpsType = box?.position_type === 'gps' || box?.position_type === 'map';
  const hasCoords = box?.lat != null && box?.lng != null;
  
  return isGpsType && hasCoords;
}

/**
 * Prüft ob Box auf Lageplan platziert ist
 */
export function isFloorplanBox(box) {
  return box?.position_type === 'floorplan' && 
         box?.floor_plan_id != null;
}

/**
 * Prüft ob Box im Pool ist (nicht platziert)
 */
export function isPoolBox(box) {
  return !isGpsBox(box) && !isFloorplanBox(box);
}

/**
 * Gibt Position-Info als Text zurück
 */
export function getPositionText(box) {
  if (isFloorplanBox(box)) {
    return box.grid_position ? `Lageplan (${box.grid_position})` : 'Lageplan';
  }
  if (isGpsBox(box)) {
    return 'GPS';
  }
  return 'Nicht platziert';
}

/**
 * Status-Farbe für Box (CSS-Klassen-Name)
 */
export function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'green' || s === 'ok') return 'green';
  if (s === 'yellow' || s.includes('gering')) return 'yellow';
  if (s === 'orange' || s.includes('auffällig')) return 'orange';
  if (s === 'red' || s.includes('befall')) return 'red';
  return 'gray';
}

/**
 * Status-Farbe als HEX
 */
export function getStatusHex(status) {
  const colors = {
    green: '#10b981',
    yellow: '#eab308',
    orange: '#fb923c',
    red: '#dc2626',
    gray: '#6b7280',
    blue: '#3b82f6',
  };
  return colors[getStatusColor(status)] || colors.gray;
}

/**
 * Box-Icon basierend auf Typ
 */
export function getBoxIcon(box) {
  const icons = {
    'Mausbox': '🐭',
    'Rattenbox': '🐀',
    'Nagerbox': '🐀',
    'Insektenfalle': '🪲',
    'Pheromonfalle': '🦋',
    'UV-Falle': '💡',
    'Klebestreifen': '📋',
    'Schlagfalle': '⚡'
  };
  
  const typeName = box?.box_type_name || '';
  
  // Exakten Match suchen
  if (icons[typeName]) return icons[typeName];
  
  // Teilmatch suchen
  const lowerName = typeName.toLowerCase();
  if (lowerName.includes('maus')) return '🐭';
  if (lowerName.includes('ratte') || lowerName.includes('nager')) return '🐀';
  if (lowerName.includes('insekt') || lowerName.includes('käfer')) return '🪲';
  if (lowerName.includes('uv') || lowerName.includes('licht')) return '💡';
  if (lowerName.includes('schlag')) return '⚡';
  
  return '📦';
}