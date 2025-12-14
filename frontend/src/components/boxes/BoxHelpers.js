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
 * GEÄNDERT: GPS-Koordinaten sind das Hauptkriterium
 */
export function isGpsBox(box) {
  // Box ist GPS-Box wenn:
  // 1. lat/lng gesetzt sind UND
  // 2. NICHT auf Lageplan (floor_plan_id nicht gesetzt ODER keine pos_x/pos_y)
  const hasCoords = box?.lat != null && box?.lng != null;
  const isOnFloorplan = box?.floor_plan_id != null && box?.pos_x != null;
  
  // Auch position_type berücksichtigen
  const isGpsType = box?.position_type === 'gps' || box?.position_type === 'map';
  
  // GPS wenn Koordinaten vorhanden UND nicht auf Lageplan
  return hasCoords && !isOnFloorplan;
}

/**
 * Prüft ob Box auf Lageplan platziert ist
 * GEÄNDERT: Prüft floor_plan_id UND pos_x/pos_y statt nur position_type
 */
export function isFloorplanBox(box) {
  // Box ist auf Lageplan wenn:
  // 1. floor_plan_id existiert UND
  // 2. pos_x/pos_y gesetzt sind (tatsächlich platziert)
  const hasFloorplanId = box?.floor_plan_id != null;
  const hasPosition = box?.pos_x != null && box?.pos_y != null;
  
  // Auch position_type berücksichtigen für Rückwärtskompatibilität
  const isFloorplanType = box?.position_type === 'floorplan';
  
  return hasFloorplanId && (hasPosition || isFloorplanType);
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
 * Box-Icon - Einzelner Buchstabe basierend auf Typ (wie Maps)
 * T = Trap/Schlagfalle
 * R = Rodent/Nager/Köder
 * I = Insekt
 * L = Licht/UV
 * B = Box (Standard)
 */
export function getBoxIcon(box) {
  const typeName = (box?.box_type_name || "").toLowerCase();
  if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
  if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("rodent") || typeName.includes("nager") || typeName.includes("köder") || typeName.includes("ratte") || typeName.includes("maus")) return "R";
  if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("käfer")) return "I";
  if (typeName.includes("uv") || typeName.includes("licht")) return "L";
  return "B";
}