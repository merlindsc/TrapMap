/* ============================================================
   TRAPMAP - BOX LIST ITEM WITH FLYTO
   Komponente für Box-Einträge in der Sidebar mit FlyTo Button
   ============================================================ */

import { Clock, User, ChevronRight, LayoutGrid, Navigation2 } from "lucide-react";

// Helper: QR-Nummer extrahieren (ohne führende Null)
export const getShortQr = (box) => {
  if (box.qr_code) {
    const match = box.qr_code.match(/(\d+)/);
    if (match) return parseInt(match[1], 10).toString();
  }
  return null;
};

// Helper: Display Number
export const getBoxDisplayNumber = (box) => {
  if (box.qr_code) {
    const match = box.qr_code.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10).toString();
  }
  return box.number || box.id;
};

// Helper: Status Color
export const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "green" || s === "ok") return "green";
  if (s === "yellow" || s.includes("gering")) return "yellow";
  if (s === "orange" || s.includes("auffällig")) return "orange";
  if (s === "red" || s.includes("befall")) return "red";
  return "gray";
};

// Formatierung für letzten Scan
const formatLastScan = (lastScan) => {
  if (!lastScan) return "Nie";
  const date = new Date(lastScan);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
};

/**
 * BoxListItem - Box-Eintrag in der Sidebar
 * 
 * @param {Object} box - Die Box-Daten
 * @param {Function} onClick - Click-Handler für die Box
 * @param {Function} onFlyTo - FlyTo-Handler (optional) - nur für GPS-Boxen
 * @param {boolean} isFloorplan - Ist das eine Lageplan-Box?
 * @param {boolean} showFlyTo - FlyTo-Button anzeigen?
 */
export default function BoxListItem({ 
  box, 
  onClick, 
  onFlyTo, 
  isFloorplan = false,
  showFlyTo = true
}) {
  const displayNum = getBoxDisplayNumber(box);
  const shortQr = getShortQr(box);
  const statusColor = getStatusColor(box.current_status || box.status);
  
  // FlyTo nur anzeigen wenn:
  // 1. showFlyTo = true
  // 2. Box hat GPS-Koordinaten
  // 3. Box ist KEINE Lageplan-Box
  const canFlyTo = showFlyTo && box.lat && box.lng && !isFloorplan && onFlyTo;

  const handleFlyToClick = (e) => {
    e.stopPropagation(); // Verhindert dass onClick ausgelöst wird
    if (onFlyTo && box.lat && box.lng) {
      onFlyTo(box);
    }
  };

  return (
    <div 
      className={`box-item-detailed ${isFloorplan ? 'floorplan' : ''}`} 
      onClick={onClick}
    >
      <div className="box-item-main">
        <div className={`box-number-badge ${statusColor}`}>
          {displayNum}
        </div>
        <div className="box-item-info">
          <div className="box-item-name">
            {/* QR-Nummer anzeigen wenn vorhanden */}
            {shortQr && (
              <span style={{ 
                color: '#9ca3af', 
                fontSize: '11px', 
                fontFamily: 'monospace',
                marginRight: '6px'
              }}>
                #{shortQr}
              </span>
            )}
            {box.box_type_name || 'Kein Typ'}
            {isFloorplan && <LayoutGrid size={12} className="floorplan-badge" style={{ marginLeft: '4px', color: '#8b5cf6' }} />}
          </div>
          <div className="box-item-meta">
            <span className="last-scan">
              <Clock size={11} />
              {formatLastScan(box.last_scan)}
            </span>
            {box.last_scan_by && (
              <span className="technician">
                <User size={11} />
                {box.last_scan_by}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="box-item-right">
        {/* FlyTo Button - nur für GPS-Boxen */}
        {canFlyTo && (
          <button
            onClick={handleFlyToClick}
            className="flyto-btn"
            title="Zur Box fliegen"
            style={{
              padding: '6px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '6px',
              color: '#60a5fa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.3)';
              e.target.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.2)';
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            }}
          >
            <Navigation2 size={14} />
          </button>
        )}
        
        <span className={`status-indicator ${statusColor}`} />
        <ChevronRight size={14} className="item-chevron" />
      </div>
    </div>
  );
}

/**
 * BoxListItemUnplaced - Unplatzierte Box zum Drag & Drop
 */
export function BoxListItemUnplaced({ 
  box, 
  isSelected, 
  onClick, 
  onDragStart,
  isMobile = false 
}) {
  const shortQr = getShortQr(box);
  const displayNum = getBoxDisplayNumber(box);

  // Icon basierend auf Box-Typ
  const getBoxIcon = () => {
    const typeName = (box.box_type_name || "").toLowerCase();
    if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
    if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("rodent") || typeName.includes("nager") || typeName.includes("köder") || typeName.includes("ratte") || typeName.includes("maus")) return "R";
    if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("käfer")) return "I";
    if (typeName.includes("uv") || typeName.includes("licht")) return "L";
    return "B";
  };

  return (
    <div
      className={`box-item unplaced ${isSelected ? 'selected' : ''}`}
      draggable={!isMobile}
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        cursor: isMobile ? 'pointer' : 'grab',
        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : undefined,
        borderColor: isSelected ? '#10b981' : undefined
      }}
    >
      <span className="box-icon">{getBoxIcon()}</span>
      <div className="box-info">
        <h4>
          {/* QR-Nummer prominent anzeigen */}
          {shortQr || displayNum}
        </h4>
        <p>{box.box_type_name || 'Kein Typ'}</p>
      </div>
      <span 
        className="drag-hint" 
        style={{ color: isSelected ? '#10b981' : undefined }}
      >
        {isMobile 
          ? (isSelected ? '✓ Karte tippen' : '→ Antippen') 
          : '⇢ Ziehen'}
      </span>
    </div>
  );
}