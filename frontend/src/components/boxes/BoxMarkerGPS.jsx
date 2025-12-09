/* ============================================================
   BOX MARKER GPS - VERSION 5.0
   ============================================================ */

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Custom icon based on status
const getBoxIcon = (status) => {
  const colors = {
    green: "#10b981",
    yellow: "#eab308",
    orange: "#fb923c",
    red: "#dc2626",
    gray: "#6b7280",
    blue: "#3b82f6",
  };

  const color = colors[status] || colors.gray;

  return L.divIcon({
    className: "custom-box-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export default function BoxMarkerGPS({ box, onClick, onEdit }) {
  if (!box?.lat || !box?.lng) return null;

  const icon = getBoxIcon(box.current_status);

  return (
    <Marker
      position={[box.lat, box.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(box),
      }}
    >
      <Popup>
        <div style={{ minWidth: "150px" }}>
          <div style={{ fontWeight: "600", marginBottom: "4px" }}>
            {box.box_name || `Box ${box.id}`}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Box #{box.box_number || box.id}
          </div>
          <button
            onClick={() => onEdit(box)}
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Bearbeiten
          </button>
        </div>
      </Popup>
    </Marker>
  );
}