// ============================================
// BOX MARKER KOMPONENTE FÜR LEAFLET
// Kleiner Pin-Marker statt großem Kreis
// ============================================

import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// ============================================
// STATUS FARBEN
// ============================================
const STATUS_COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#9ca3af'
};

// ============================================
// KLEINER PIN-MARKER (SVG)
// ============================================
const createPinIcon = (status = 'green', number = '') => {
  const color = STATUS_COLORS[status] || STATUS_COLORS.gray;
  
  // Kleiner, einfacher Pin - nur Stecknadel, kein großer Kreis
  const svgPin = `
    <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <!-- Pin-Kopf -->
      <circle cx="12" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
      <!-- Pin-Spitze -->
      <path d="M12 18 L8 10 L16 10 Z" fill="${color}"/>
      <path d="M12 18 L12 30" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <!-- Nummer im Pin -->
      <text x="12" y="13" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="Arial, sans-serif">
        ${number}
      </text>
    </svg>
  `;

  return L.divIcon({
    html: svgPin,
    className: 'box-pin-marker',
    iconSize: [24, 32],
    iconAnchor: [12, 32], // Spitze des Pins
    popupAnchor: [0, -32]
  });
};

// ============================================
// EINFACHER PUNKT-MARKER (für Kontrollansicht)
// Nur ein kleiner Punkt ohne Text
// ============================================
const createDotIcon = (status = 'green') => {
  const color = STATUS_COLORS[status] || STATUS_COLORS.gray;
  
  const svgDot = `
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>
  `;

  return L.divIcon({
    html: svgDot,
    className: 'box-dot-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

// ============================================
// BOX MARKER KOMPONENTE
// ============================================
export default function BoxMarker({ 
  box, 
  onClick,
  showNumber = true,
  simplified = false, // true = nur Punkt, false = Pin mit Nummer
  children 
}) {
  if (!box.lat || !box.lng) return null;

  const position = [box.lat, box.lng];
  const status = box.current_status || 'green';
  
  // Icon basierend auf Modus
  const icon = simplified 
    ? createDotIcon(status)
    : createPinIcon(status, showNumber ? (box.number || '') : '');

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick && onClick(box)
      }}
    >
      {children || (
        <Popup>
          <div className="text-sm">
            <p className="font-bold">Box #{box.number || box.id}</p>
            {box.box_type_name && (
              <p className="text-gray-600">{box.box_type_name}</p>
            )}
            {box.notes && (
              <p className="text-gray-500 text-xs mt-1">{box.notes}</p>
            )}
          </div>
        </Popup>
      )}
    </Marker>
  );
}

// ============================================
// EXPORT HELPER FUNCTIONS
// ============================================
export { createPinIcon, createDotIcon, STATUS_COLORS };