/* ============================================================
   TRAPMAP - BOX SCAN DIALOG V3
   Kontrolle + Verlauf + Mini-Karte + Box-Name/Nummer Anzeige
   
   FEATURES:
   - Mini-Karte für GPS-Boxen mit Live-Distanz
   - Zeigt Box-Name/Nummer wenn anders als QR-Code
   - Nach Speichern → Scanner wieder aktiv (via onScanCreated)
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, Camera, Clock, CheckCircle, AlertCircle, Edit3, MapPin, Navigation, Maximize2, Hash } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_API_URL;

const STATUS = {
  green: { label: "OK", color: "#238636" },
  yellow: { label: "Leicht", color: "#9e6a03" },
  orange: { label: "Mittel", color: "#bd561d" },
  red: { label: "Stark", color: "#da3633" }
};

// BoxType aus Name erkennen
function detectBoxType(box) {
  const typeName = (box?.box_types?.name || box?.box_type_name || "").toLowerCase();
  
  if (typeName.includes("schlag") || typeName.includes("snap") || typeName.includes("trap"))
    return "schlagfalle";
  if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("köder"))
    return "giftbox";
  if (typeName.includes("nager") || typeName.includes("rodent") || typeName.includes("maus") || typeName.includes("ratte"))
    return "monitoring_rodent";
  if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("fliege") || typeName.includes("motte"))
    return "monitoring_insect";
  
  return "default";
}

// Automatische Status-Berechnung basierend auf BoxType
function autoStatus(boxType, consumption, quantity, trapState) {
  // Schlagfalle
  if (boxType === "schlagfalle") {
    if (trapState === 0) return "green";   // nicht ausgelöst
    if (trapState === 1) return "yellow";  // ausgelöst
    if (trapState === 2) return "red";     // Tier drin
  }

  // Köder / Monitoring Nager
  if (boxType === "monitoring_rodent" || boxType === "giftbox") {
    const c = parseInt(consumption) || 0;
    if (c === 0) return "green"; 
    if (c <= 25) return "yellow";
    if (c <= 50) return "orange";
    return "red";
  }

  // Insekten
  if (boxType === "monitoring_insect") {
    if (quantity === "none" || quantity === "0") return "green";
    if (quantity === "0-5") return "yellow";
    if (quantity === "5-10") return "orange";
    return "red"; // 10–20, 20+
  }

  // Default: consumption-basiert
  const c = parseInt(consumption) || 0;
  if (c === 0) return "green";
  if (c <= 25) return "yellow";
  if (c <= 75) return "orange";
  return "red";
}

// QR-Nummer extrahieren (ohne führende Null, ohne Prefix)
const getShortQr = (box) => {
  if (box?.qr_code) {
    const match = box.qr_code.match(/(\d+)/);
    if (match) return parseInt(match[1], 10).toString();
  }
  return null;
};

// Prüfen ob Box einen eigenen Namen/Nummer hat (anders als QR)
const getBoxDisplayInfo = (box) => {
  const qrNumber = getShortQr(box);
  const displayNumber = box?.display_number || box?.number;
  const boxName = box?.name || box?.box_name;
  
  // Hat die Box eine eigene Nummer die anders ist als QR?
  const hasCustomNumber = displayNumber && displayNumber.toString() !== qrNumber;
  
  // Hat die Box einen Namen?
  const hasName = boxName && boxName.trim().length > 0;
  
  return {
    qrNumber,
    displayNumber: displayNumber || qrNumber,
    boxName: hasName ? boxName : null,
    hasCustomNumber,
    hasName
  };
};

// Distanz berechnen (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Distanz formatieren
function formatDistance(meters) {
  if (meters >= 500) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)}m`;
}

// Custom Marker Icons
const boxIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 28px; height: 28px; 
    background: #ef4444; 
    border: 3px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
  ">
    <span style="color: white; font-size: 14px;">📍</span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const userIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 18px; height: 18px; 
    background: #3b82f6; 
    border: 3px solid white; 
    border-radius: 50%; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// Map Auto-Fit Component
function MapFitter({ boxPos, userPos }) {
  const map = useMap();
  
  useEffect(() => {
    if (boxPos && userPos) {
      const bounds = L.latLngBounds([boxPos, userPos]);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
    } else if (boxPos) {
      map.setView(boxPos, 17);
    }
  }, [boxPos, userPos, map]);
  
  return null;
}

export default function BoxScanDialog({ 
  box, 
  onClose, 
  onSave,
  onScanCreated,      // WICHTIG: Scanner nutzt das zum Neustarten!
  onEdit,
  onAdjustPosition,
  onSetGPS,
  onShowDetails
}) {
  const token = localStorage.getItem("trapmap_token");
  
  const [tab, setTab] = useState("scan");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Form
  const [consumption, setConsumption] = useState("0");
  const [trapState, setTrapState] = useState(0);        // Für Schlagfallen
  const [quantity, setQuantity] = useState("none");     // Für Insektenmonitore
  const [status, setStatus] = useState("green");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // History
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // GPS für Mini-Karte
  const [userPosition, setUserPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [distance, setDistance] = useState(null);

  // Box-Info extrahieren
  const boxInfo = getBoxDisplayInfo(box);
  const typeName = box?.box_types?.name || box?.box_type_name || "Unbekannt";
  const boxType = detectBoxType(box); // NEU: BoxType erkennen
  
  // Position Type
  const isFloorplanBox = box?.position_type === 'floorplan' || box?.floor_plan_id;
  const hasGPS = box?.lat && box?.lng && !isFloorplanBox;
  const boxPosition = hasGPS ? [parseFloat(box.lat), parseFloat(box.lng)] : null;

  // Mobile Detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // GPS Position für Mini-Karte - NUR AUF MOBILE!
  useEffect(() => {
    if (!hasGPS) return;
    
    // DESKTOP: Kein GPS-Tracking, nur Box-Position zeigen
    if (!isMobile) {
      setDistance(null); // Keine Distanz auf Desktop
      return;
    }
    
    if (!navigator.geolocation) {
      setGpsError("GPS nicht verfügbar");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const userPos = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(userPos);
        setGpsError(null);
        
        if (boxPosition) {
          const dist = calculateDistance(
            boxPosition[0], boxPosition[1],
            userPos[0], userPos[1]
          );
          setDistance(dist);
        }
      },
      (err) => {
        console.error("GPS error:", err);
        // Auf Mobile: Fehler zeigen, aber nicht blockieren
        setGpsError("GPS nicht verfügbar");
        setDistance(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasGPS, box?.lat, box?.lng, isMobile]);

  // Status automatisch berechnen basierend auf BoxType
  useEffect(() => {
    const newStatus = autoStatus(boxType, consumption, quantity, trapState);
    setStatus(newStatus);
  }, [consumption, quantity, trapState, boxType]);

  // History laden
  useEffect(() => {
    loadHistory();
  }, [box?.id]);

  const loadHistory = async () => {
    if (!box?.id) return;
    setHistLoading(true);
    try {
      const r = await fetch(`${API}/scans?box_id=${box.id}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setHistory(Array.isArray(d) ? d : d.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setHistLoading(false);
  };

  const handlePhoto = (e) => {
    const f = e.target.files[0];
    if (f) {
      setPhoto(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("box_id", box.id);
      fd.append("object_id", box.object_id || box.objects?.id || "");
      fd.append("status", status);
      fd.append("notes", notes);
      if (photo) fd.append("photo", photo);
      
      // BoxType-spezifische Felder
      if (boxType === "schlagfalle") {
        fd.append("trap_state", trapState);
      } else if (boxType === "monitoring_insect") {
        fd.append("quantity", quantity);
      } else {
        // Default: consumption für Köder/Nager/Default
        fd.append("consumption", consumption);
      }

      const r = await fetch(`${API}/scans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      if (r.ok) {
        setToast({ type: "success", msg: "Kontrolle gespeichert!" });
        
        // WICHTIG: Kurze Verzögerung, dann Callback aufrufen
        setTimeout(() => { 
          // onScanCreated ist der primäre Callback für Scanner
          if (onScanCreated) {
            onScanCreated();
          } else if (onSave) {
            onSave();
          }
        }, 600);
      } else {
        throw new Error("Fehler beim Speichern");
      }
    } catch (e) {
      setToast({ type: "error", msg: e.message });
      setLoading(false);
    }
  };

  const getUserName = (scan) => {
    if (scan.users) {
      const u = scan.users;
      if (u.first_name || u.last_name) {
        return `${u.first_name || ''} ${u.last_name || ''}`.trim();
      }
      if (u.email) return u.email.split('@')[0];
    }
    return scan.user_name || scan.technician_name || "Unbekannt";
  };

  const showPositionButtons = onAdjustPosition || onSetGPS;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          padding: "8px 16px", borderRadius: 6, zIndex: 10001,
          background: toast.type === "success" ? "#238636" : "#da3633",
          color: "#fff", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6
        }}>
          {toast.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          {toast.msg}
        </div>
      )}

      {/* Overlay */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "#0d1117", borderRadius: 8, width: "92%", maxWidth: 380,
          border: "1px solid #21262d", overflow: "hidden", maxHeight: "90vh",
          display: "flex", flexDirection: "column"
        }}>
          
          {/* Header - MIT BOX-NAME/NUMMER ANZEIGE */}
          <div style={{
            padding: "10px 14px", background: "#161b22",
            borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Box-Nummer Badge */}
              <div style={{
                width: 30, height: 30, borderRadius: 6,
                background: STATUS[box?.current_status]?.color || "#1f6feb",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12, color: "#fff"
              }}>
                {boxInfo.displayNumber}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Zeige Box-Name wenn vorhanden */}
                  {boxInfo.hasName ? boxInfo.boxName : `Box #${boxInfo.displayNumber}`}
                  
                  {onEdit && (
                    <button
                      onClick={() => onEdit()}
                      style={{
                        padding: "4px 10px", background: "#1f6feb", border: "none",
                        borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                      }}
                    >
                      <Edit3 size={11}/> Bearbeiten
                    </button>
                  )}
                </div>
                
                {/* Subtitle: Typ + QR-Info wenn anders als Display */}
                <div style={{ fontSize: 11, color: "#8b949e", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{typeName}</span>
                  
                  {/* QR-Code Badge - IMMER zeigen wenn vorhanden */}
                  {boxInfo.qrNumber && (
                    <span style={{ 
                      background: "#30363d", 
                      padding: "1px 6px", 
                      borderRadius: 4, 
                      fontSize: 10,
                      fontFamily: "monospace",
                      display: "flex",
                      alignItems: "center",
                      gap: 3
                    }}>
                      <Hash size={9} />
                      QR {boxInfo.qrNumber}
                    </span>
                  )}
                  
                  {/* Hinweis wenn Nummer anders als QR */}
                  {boxInfo.hasCustomNumber && (
                    <span style={{ color: "#f0b429", fontSize: 10 }}>
                      (Nr. {boxInfo.displayNumber})
                    </span>
                  )}
                  
                  {/* Lageplan-Position */}
                  {isFloorplanBox && box?.grid_position && (
                    <span style={{ color: "#8b5cf6" }}>• {box.grid_position}</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: 4
            }}>
              <X size={18}/>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#161b22", borderBottom: "1px solid #21262d" }}>
            <button onClick={() => setTab("scan")} style={{
              flex: 1, padding: "10px", background: "none", border: "none",
              color: tab === "scan" ? "#58a6ff" : "#8b949e",
              borderBottom: tab === "scan" ? "2px solid #58a6ff" : "2px solid transparent",
              fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <CheckCircle size={13}/> Kontrolle
            </button>
            <button onClick={() => setTab("history")} style={{
              flex: 1, padding: "10px", background: "none", border: "none",
              color: tab === "history" ? "#58a6ff" : "#8b949e",
              borderBottom: tab === "history" ? "2px solid #58a6ff" : "2px solid transparent",
              fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <Clock size={13}/> Verlauf ({history.length})
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {tab === "scan" ? (
              <>
                {/* ========== MINI-KARTE FÜR GPS-BOXEN ========== */}
                {hasGPS && boxPosition && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ 
                      height: 120, 
                      borderRadius: 8, 
                      overflow: "hidden",
                      border: "1px solid #30363d",
                      position: "relative"
                    }}>
                      <MapContainer
                        center={boxPosition}
                        zoom={17}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                        attributionControl={false}
                        dragging={false}
                        touchZoom={false}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={boxPosition} icon={boxIcon}>
                          <Popup>Box #{boxInfo.displayNumber}</Popup>
                        </Marker>
                        {userPosition && (
                          <Marker position={userPosition} icon={userIcon}>
                            <Popup>Dein Standort</Popup>
                          </Marker>
                        )}
                        <MapFitter boxPos={boxPosition} userPos={userPosition} />
                      </MapContainer>

                      {onShowDetails && (
                        <button
                          onClick={onShowDetails}
                          style={{
                            position: "absolute", top: 6, right: 6, zIndex: 1000,
                            background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 10,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                          }}
                        >
                          <Maximize2 size={11} /> Vollbild
                        </button>
                      )}
                    </div>

                    {/* Distanz-Anzeige - NUR auf Mobile sinnvoll */}
                    {isMobile ? (
                      <div style={{
                        marginTop: 6, padding: "6px 10px", borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: distance !== null 
                          ? (distance <= 10 ? "rgba(35,134,54,0.15)" : "rgba(234,179,8,0.15)")
                          : "#161b22",
                        border: distance !== null
                          ? (distance <= 10 ? "1px solid rgba(35,134,54,0.3)" : "1px solid rgba(234,179,8,0.3)")
                          : "1px solid #30363d"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {distance !== null ? (
                            distance <= 10 ? (
                              <CheckCircle size={14} style={{ color: "#3fb950" }} />
                            ) : (
                              <AlertCircle size={14} style={{ color: "#f0b429" }} />
                            )
                          ) : (
                            <div style={{ 
                              width: 12, height: 12, 
                              border: "2px solid #8b949e", borderTopColor: "transparent",
                              borderRadius: "50%", animation: "spin 1s linear infinite"
                            }} />
                          )}
                          <span style={{ 
                            fontSize: 11, 
                            color: distance !== null 
                              ? (distance <= 10 ? "#3fb950" : "#f0b429")
                              : "#8b949e"
                          }}>
                            {distance !== null 
                              ? (distance <= 10 ? "Position OK" : `Entfernung: ${formatDistance(distance)}`)
                              : (gpsError || "GPS wird ermittelt...")
                            }
                          </span>
                        </div>
                        
                        {distance !== null && distance > 10 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#f0b429" }}>
                            {formatDistance(distance)}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* DESKTOP: Keine GPS-Distanz, nur Info */
                      <div style={{
                        marginTop: 6, padding: "6px 10px", borderRadius: 6,
                        background: "#161b22", border: "1px solid #30363d",
                        display: "flex", alignItems: "center", gap: 6
                      }}>
                        <MapPin size={14} style={{ color: "#64748b" }} />
                        <span style={{ fontSize: 11, color: "#8b949e" }}>
                          Box-Position auf Karte
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Lageplan-Info */}
                {isFloorplanBox && box?.grid_position && (
                  <div style={{
                    marginBottom: 14, padding: "10px 12px",
                    background: "#8b5cf615", border: "1px solid #8b5cf630",
                    borderRadius: 8, display: "flex", alignItems: "center", gap: 10
                  }}>
                    <MapPin size={18} style={{ color: "#a78bfa" }} />
                    <div>
                      <div style={{ fontSize: 11, color: "#8b949e" }}>Lageplan-Position</div>
                      <div style={{ fontSize: 14, color: "#a78bfa", fontWeight: 700, fontFamily: "monospace" }}>
                        {box.grid_position}
                      </div>
                    </div>
                  </div>
                )}

                {/* === BOXTYPE-SPEZIFISCHE FELDER === */}
                
                {/* SCHLAGFALLE: Zustand der Falle */}
                {boxType === "schlagfalle" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                      Zustand der Falle *
                    </label>
                    <select
                      value={trapState}
                      onChange={(e) => setTrapState(Number(e.target.value))}
                      style={{
                        width: "100%", padding: "12px", background: "#161b22",
                        border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3",
                        fontSize: 13, cursor: "pointer"
                      }}
                    >
                      <option value={0}>✓ Nicht ausgelöst</option>
                      <option value={1}>⚠️ Ausgelöst (leer)</option>
                      <option value={2}>🐀 Tier gefunden</option>
                    </select>
                  </div>
                )}

                {/* INSEKTENMONITOR: Menge */}
                {boxType === "monitoring_insect" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                      Insektenmenge *
                    </label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        width: "100%", padding: "12px", background: "#161b22",
                        border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3",
                        fontSize: 13, cursor: "pointer"
                      }}
                    >
                      <option value="none">✓ Keine</option>
                      <option value="0-5">○ 0–5 Stück</option>
                      <option value="5-10">● 5–10 Stück</option>
                      <option value="10-20">●● 10–20 Stück</option>
                      <option value="20+">●●● 20+ Stück</option>
                    </select>
                  </div>
                )}

                {/* KÖDER/NAGER/DEFAULT: Verbrauch */}
                {(boxType === "giftbox" || boxType === "monitoring_rodent" || boxType === "default") && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                      Köderverbrauch *
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["0", "25", "50", "75", "100"].map(v => (
                        <button key={v} onClick={() => setConsumption(v)} style={{
                          flex: 1, padding: "10px 0",
                          background: consumption === v ? "#21262d" : "transparent",
                          border: consumption === v ? "2px solid #58a6ff" : "1px solid #30363d",
                          borderRadius: 6, color: consumption === v ? "#e6edf3" : "#8b949e",
                          fontSize: 12, fontWeight: consumption === v ? 600 : 400, cursor: "pointer"
                        }}>
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div style={{
                  background: STATUS[status].color, borderRadius: 6,
                  padding: "10px 12px", marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 8,
                  color: "#fff", fontSize: 12, fontWeight: 500
                }}>
                  <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%" }}/>
                  Status: {STATUS[status].label}
                </div>

                {/* Notizen */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                    Notizen
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Bemerkungen zur Kontrolle..."
                    rows={2}
                    style={{
                      width: "100%", padding: "10px", background: "#161b22",
                      border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3",
                      fontSize: 12, resize: "none", boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Foto */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 500, color: "#8b949e" }}>
                    Foto (optional)
                  </label>
                  {photoPreview ? (
                    <div style={{ position: "relative" }}>
                      <img src={photoPreview} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6 }}/>
                      <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{
                        position: "absolute", top: 4, right: 4, background: "#da3633",
                        border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <X size={12} color="#fff"/>
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "12px", border: "1px dashed #30363d", borderRadius: 6,
                      background: "#161b22", color: "#8b949e", fontSize: 12, cursor: "pointer"
                    }}>
                      <Camera size={16}/> Foto aufnehmen
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }}/>
                    </label>
                  )}
                </div>

                {/* Position Buttons */}
                {showPositionButtons && (
                  <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #21262d" }}>
                    {onAdjustPosition && (
                      <button
                        onClick={() => onAdjustPosition(box)}
                        style={{
                          flex: 1, padding: "10px", background: "#1f6feb20",
                          border: "1px solid #1f6feb", borderRadius: 6, color: "#58a6ff",
                          fontSize: 11, cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center", gap: 6
                        }}
                      >
                        <MapPin size={14} /> 
                        {isFloorplanBox ? "Position auf Plan" : "Position verschieben"}
                      </button>
                    )}
                    
                    {/* GPS Button NUR auf Mobile und NUR für GPS-Boxen */}
                    {onSetGPS && !isFloorplanBox && isMobile && (
                      <button
                        onClick={() => onSetGPS(box)}
                        style={{
                          flex: 1, padding: "10px", background: "#161b22",
                          border: "1px solid #30363d", borderRadius: 6, color: "#8b949e",
                          fontSize: 11, cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center", gap: 6
                        }}
                      >
                        <Navigation size={14} /> GPS aktualisieren
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* History */
              histLoading ? (
                <div style={{ textAlign: "center", color: "#8b949e", padding: 24, fontSize: 12 }}>Lade...</div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8b949e", padding: 24, fontSize: 12 }}>Keine Kontrollen</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map((s, i) => (
                    <div key={s.id || i} style={{
                      padding: "12px", background: "#161b22", borderRadius: 6, border: "1px solid #21262d"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS[s.status]?.color || "#8b949e" }}/>
                        <div style={{ flex: 1, fontSize: 12, color: "#e6edf3", fontWeight: 500 }}>
                          {new Date(s.scanned_at || s.created_at).toLocaleDateString("de-DE", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                        {/* Consumption Badge */}
                        {s.consumption !== undefined && s.consumption !== null && (
                          <div style={{ fontSize: 11, color: "#8b949e", background: "#21262d", padding: "2px 8px", borderRadius: 4 }}>
                            {s.consumption}%
                          </div>
                        )}
                        {/* Trap State Badge */}
                        {s.trap_state !== undefined && s.trap_state !== null && (
                          <div style={{ 
                            fontSize: 11, 
                            color: s.trap_state === 0 ? "#3fb950" : s.trap_state === 1 ? "#d29922" : "#f85149", 
                            background: "#21262d", padding: "2px 8px", borderRadius: 4 
                          }}>
                            {s.trap_state === 0 ? "✓ OK" : s.trap_state === 1 ? "⚠️ Ausgelöst" : "🐀 Tier"}
                          </div>
                        )}
                        {/* Quantity Badge */}
                        {s.quantity && s.quantity !== "none" && (
                          <div style={{ fontSize: 11, color: "#8b949e", background: "#21262d", padding: "2px 8px", borderRadius: 4 }}>
                            🪲 {s.quantity}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ fontSize: 11, color: "#8b949e", display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{ color: "#6e7681" }}>Kontrolleur:</span>
                          <span style={{ color: "#e6edf3" }}>{getUserName(s)}</span>
                        </div>
                        
                        {s.notes && !s.notes.startsWith("Ersteinrichtung") && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ color: "#6e7681" }}>Notiz:</span>
                            <span style={{ color: "#e6edf3" }}>{s.notes}</span>
                          </div>
                        )}
                        
                        {s.scan_type === "setup" && (
                          <div style={{ 
                            marginTop: 4, fontSize: 10, color: "#3fb950", 
                            background: "rgba(35,134,54,0.15)", padding: "2px 6px", 
                            borderRadius: 3, display: "inline-block", width: "fit-content"
                          }}>
                            Ersteinrichtung
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          {tab === "scan" && (
            <div style={{ padding: "12px 14px", background: "#161b22", borderTop: "1px solid #21262d" }}>
              <button onClick={submit} disabled={loading} style={{
                width: "100%", padding: "11px", borderRadius: 6, border: "none",
                background: loading ? "#21262d" : "#238636", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
                <Save size={14}/> {loading ? "Speichern..." : "Kontrolle speichern"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spin Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}