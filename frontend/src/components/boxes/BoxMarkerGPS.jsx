/* ============================================================
   TRAPMAP - BOX MARKER KOMPONENTE
   
   Zeigt:
   - QR-Nummer (kurz) ÜBER dem Kreis
   - Display-Nummer (1, 2, 3...) IM Kreis
   - Grid-Position UNTER dem Kreis (nur Lageplan)
   - Status-Farbe als Kreis-Hintergrund
   ============================================================ */

import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getShortQr, getStatusColor, getBoxIcon } from './boxHelpers';

/**
 * Erstellt das Marker-Icon mit allen Nummern
 */
function createBoxIcon(box, displayNumber, isFloorplan = false) {
  const shortQr = getShortQr(box);
  const statusColor = getStatusColor(box.current_status);
  
  // Grid-Position nur bei Lageplan
  const gridHtml = isFloorplan && box.grid_position 
    ? `<div class="box-grid-label">${box.grid_position}</div>` 
    : '';

  const html = `
    <div class="box-marker-container">
      <div class="box-qr-label">${shortQr}</div>
      <div class="box-circle" style="background-color: ${statusColor}">
        <span class="box-display-number">${displayNumber || '?'}</span>
      </div>
      ${gridHtml}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'box-marker-wrapper',
    iconSize: [40, 60],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50]
  });
}

/**
 * BoxMarker für Leaflet Maps
 */
export function BoxMarker({ 
  box, 
  displayNumber,
  position,
  isFloorplan = false,
  onClick,
  onDragEnd,
  draggable = false
}) {
  if (!position || !position[0] || !position[1]) return null;

  const icon = createBoxIcon(box, displayNumber, isFloorplan);

  return (
    <Marker
      position={position}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        click: () => onClick?.(box),
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onDragEnd?.(box, { lat, lng });
        }
      }}
    >
      <Popup>
        <div className="box-popup">
          <div className="box-popup-header">
            <span className="box-popup-icon">{getBoxIcon(box)}</span>
            <strong>Box #{displayNumber}</strong>
          </div>
          <div className="box-popup-info">
            <div>QR: {box.qr_code}</div>
            <div>Typ: {box.box_type_name || 'Standard'}</div>
            <div>Status: {box.current_status || 'pending'}</div>
            {box.grid_position && <div>Position: {box.grid_position}</div>}
            {box.bait && <div>Köder: {box.bait}</div>}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * BoxMarker für Lageplan (ImageOverlay)
 * Verwendet absolute Positionierung statt Leaflet
 */
export function FloorplanBoxMarker({
  box,
  displayNumber,
  containerWidth,
  containerHeight,
  onClick,
  isSelected = false,
  isDragging = false
}) {
  const shortQr = getShortQr(box);
  const statusColor = getStatusColor(box.current_status);

  // Position in Pixel umrechnen
  const x = (box.pos_x / 100) * containerWidth;
  const y = (box.pos_y / 100) * containerHeight;

  return (
    <div
      className={`floorplan-box-marker ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={() => onClick?.(box)}
    >
      {/* QR-Nummer über dem Kreis */}
      <div className="box-qr-label">{shortQr}</div>
      
      {/* Kreis mit Display-Nummer */}
      <div 
        className="box-circle" 
        style={{ backgroundColor: statusColor }}
      >
        <span className="box-display-number">{displayNumber || '?'}</span>
      </div>
      
      {/* Grid-Position unter dem Kreis */}
      {box.grid_position && (
        <div className="box-grid-label">{box.grid_position}</div>
      )}
    </div>
  );
}

export default BoxMarker;