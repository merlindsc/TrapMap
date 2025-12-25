/* ============================================================
   TRAPMAP - BOX SCAN DIALOG V6 (OFFLINE-FÄHIG)
   Kontrolle + Verlauf + Mini-Karte + Box-Name/Nummer Anzeige
   + Bestätigungsdialog für "Zurück ins Lager"
   + VOLLSTÄNDIGE OFFLINE-UNTERSTÜTZUNG
   
   FEATURES:
   - Mini-Karte für GPS-Boxen mit Live-Distanz
   - Zeigt Box-Name/Nummer wenn anders als QR-Code
   - Nach Speichern → Scanner wieder aktiv (via onScanCreated)
   - Bestätigungsdialog für Return to Pool
   - 🆕 Offline-Speicherung von Kontrollen
   - 🆕 Offline-History aus Cache
   - 🆕 Visueller Offline-Indikator
   - 🔧 V6: submitLock verhindert 3x Speichern
   ============================================================ */

import { useState, useEffect, useRef } from "react";
import { X, Save, Camera, Clock, CheckCircle, AlertCircle, Edit3, MapPin, Navigation, Maximize2, Hash, Archive, AlertTriangle, WifiOff, Cloud, ArrowRight } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getBoxLabel } from "../utils/boxUtils";
import { useTheme } from "../context/ThemeContext";

// 🆕 Offline API Imports
import { 
  createScanOffline, 
  getBoxHistory, 
  returnBoxToPool,
  isOnline 
} from "../utils/offlineAPI";
import { useOffline } from "../context/OfflineContext";

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
  if (boxType === "schlagfalle") {
    if (trapState === 0) return "green";
    if (trapState === 1) return "yellow";
    if (trapState === 2) return "red";
  }

  if (boxType === "monitoring_rodent" || boxType === "giftbox") {
    const c = parseInt(consumption) || 0;
    if (c === 0) return "green"; 
    if (c <= 33) return "yellow";
    if (c <= 66) return "orange";
    return "red";
  }

  if (boxType === "monitoring_insect") {
    if (quantity === "none" || quantity === "0") return "green";
    if (quantity === "0-5") return "yellow";
    if (quantity === "5-10") return "orange";
    return "red";
  }

  const c = parseInt(consumption) || 0;
  if (c === 0) return "green";
  if (c <= 33) return "yellow";
  if (c <= 66) return "orange";
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
  
  const hasCustomNumber = displayNumber && displayNumber.toString() !== qrNumber;
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

function formatDistance(meters) {
  if (meters >= 500) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)}m`;
}

// Custom Marker Icons - KLEIN (1-2 Meter genau)
const boxIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 12px; height: 12px; 
    background: #ef4444; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const userIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 10px; height: 10px; 
    background: #3b82f6; 
    border: 2px solid white; 
    border-radius: 50%; 
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// Map Auto-Fit Component
function MapFitter({ boxPos, userPos }) {
  const map = useMap();
  
  useEffect(() => {
    if (boxPos && userPos) {
      const bounds = L.latLngBounds([boxPos, userPos]);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
    } else if (boxPos) {
      map.setView(boxPos, 18);
    }
  }, [boxPos, userPos, map]);
  
  return null;
}

// ============================================
// BESTÄTIGUNGSDIALOG KOMPONENTE
// ============================================
function ConfirmReturnDialog({ box, onConfirm, onCancel, loading, isOffline }) {
  const boxInfo = getBoxDisplayInfo(box);
  
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      zIndex: 10002, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20
    }}>
      <div style={{
        background: "#161b22", borderRadius: 12, width: "100%", maxWidth: 340,
        border: "1px solid #30363d", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", background: "#21262d",
          borderBottom: "1px solid #30363d",
          display: "flex", alignItems: "center", gap: 12
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(239, 68, 68, 0.15)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ color: "#e6edf3", fontWeight: 600, fontSize: 15 }}>
              Zurück ins Lager?
            </div>
            <div style={{ color: "#8b949e", fontSize: 12 }}>
              Box #{boxInfo.qrNumber || boxInfo.displayNumber}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {/* 🆕 Offline-Hinweis */}
          {isOffline && (
            <div style={{
              marginBottom: 12, padding: "8px 12px",
              background: "rgba(234, 179, 8, 0.15)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: 6, display: "flex", alignItems: "center", gap: 8,
              fontSize: 11, color: "#eab308"
            }}>
              <WifiOff size={14} />
              Wird offline gespeichert
            </div>
          )}
          
          <p style={{ color: "#c9d1d9", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Die Box wird vollständig zurückgesetzt:
          </p>
          <ul style={{ 
            color: "#8b949e", fontSize: 12, margin: "12px 0", 
            paddingLeft: 20, lineHeight: 1.8 
          }}>
            <li>Objekt-Zuweisung wird entfernt</li>
            <li>Position wird gelöscht</li>
            <li>Box-Typ wird zurückgesetzt</li>
            <li>Beim nächsten Scan → Neu-Einrichtung</li>
          </ul>
          <div style={{
            padding: 10, background: "#0d1117", borderRadius: 6,
            border: "1px solid #21262d", fontSize: 11, color: "#8b949e"
          }}>
            💡 Die Scan-Historie bleibt erhalten.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", background: "#0d1117",
          borderTop: "1px solid #21262d",
          display: "flex", gap: 10
        }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 6,
              border: "1px solid #30363d", background: "transparent",
              color: "#8b949e", fontSize: 13, cursor: "pointer"
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 6,
              border: "none", background: "#da3633",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}
          >
            {loading ? (
              <>
                <div style={{ 
                  width: 14, height: 14, 
                  border: "2px solid rgba(255,255,255,0.3)", 
                  borderTopColor: "#fff",
                  borderRadius: "50%", 
                  animation: "spin 1s linear infinite"
                }} />
                Wird zurückgesetzt...
              </>
            ) : (
              <>
                <Archive size={14} />
                Ja, zurück ins Lager
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 🆕 OFFLINE INDICATOR KOMPONENTE
// ============================================
function OfflineIndicator({ isOffline, pendingCount }) {
  if (!isOffline && pendingCount === 0) return null;
  
  return (
    <div style={{
      padding: "6px 10px",
      background: isOffline ? "rgba(234, 179, 8, 0.15)" : "rgba(59, 130, 246, 0.15)",
      border: `1px solid ${isOffline ? "rgba(234, 179, 8, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
      borderRadius: 6,
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 10,
      fontSize: 11
    }}>
      {isOffline ? (
        <>
          <WifiOff size={14} style={{ color: "#eab308" }} />
          <span style={{ color: "#eab308" }}>Offline-Modus aktiv</span>
        </>
      ) : (
        <>
          <Cloud size={14} style={{ color: "#3b82f6" }} />
          <span style={{ color: "#3b82f6" }}>{pendingCount} ausstehende Sync(s)</span>
        </>
      )}
    </div>
  );
}

// ============================================
// BOX TRANSFER DIALOG
// ============================================
function BoxTransferDialog({ 
  box, 
  objects, 
  selectedObjectId, 
  onSelectObject, 
  onConfirm, 
  onCancel, 
  loading 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredObjects = objects.filter(obj => 
    obj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
      zIndex: 10002, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20
    }}>
      <div style={{
        background: "#161b22", borderRadius: 12, width: "100%", maxWidth: 400,
        border: "1px solid #30363d", overflow: "hidden",
        maxHeight: "80vh", display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", background: "#21262d",
          borderBottom: "1px solid #30363d"
        }}>
          <h3 style={{ 
            margin: 0, fontSize: 15, fontWeight: 600, color: "#e6edf3",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <ArrowRight size={16} />
            Box zu anderem Objekt verschieben
          </h3>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8b949e" }}>
            Wähle das Zielobjekt für {box?.short_code || 'diese Box'}
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #30363d" }}>
          <input
            type="text"
            placeholder="Objekt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 6,
              border: "1px solid #30363d", background: "#0d1117",
              color: "#e6edf3", fontSize: 13
            }}
          />
        </div>

        {/* Object List */}
        <div style={{ 
          flex: 1, overflowY: "auto", padding: "8px"
        }}>
          {filteredObjects.length === 0 ? (
            <div style={{ 
              padding: "32px 16px", textAlign: "center", 
              color: "#8b949e", fontSize: 13 
            }}>
              Keine Objekte gefunden
            </div>
          ) : (
            filteredObjects.map(obj => (
              <button
                key={obj.id}
                onClick={() => onSelectObject(obj.id)}
                style={{
                  width: "100%", padding: "12px", marginBottom: 4,
                  borderRadius: 6, border: "1px solid #30363d",
                  background: selectedObjectId === obj.id ? "#1f6feb" : "#0d1117",
                  color: "#e6edf3", fontSize: 13, textAlign: "left",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", flexDirection: "column", gap: 4
                }}
              >
                <div style={{ fontWeight: 600 }}>{obj.name}</div>
                {obj.address && (
                  <div style={{ fontSize: 11, color: "#8b949e" }}>
                    {obj.address}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: "12px 16px", background: "#21262d",
          borderTop: "1px solid #30363d",
          display: "flex", gap: 8
        }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: "10px", borderRadius: 6,
              border: "1px solid #30363d", background: "transparent",
              color: "#8b949e", fontSize: 13, cursor: "pointer"
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !selectedObjectId}
            style={{
              flex: 1, padding: "10px", borderRadius: 6, border: "none",
              background: (!selectedObjectId || loading) ? "#21262d" : "#238636",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: (!selectedObjectId || loading) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}
          >
            {loading ? "Verschieben..." : "Verschieben"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HAUPTKOMPONENTE
// ============================================
export default function BoxScanDialog({ 
  box, 
  onClose, 
  onSave,
  onScanCreated,
  onEdit,
  onAdjustPosition,
  onSetGPS,
  onShowDetails,
  onReturnToStorage
}) {
  // Theme Context
  const { theme } = useTheme();
  
  // 🆕 Offline Context
  const { isOnline: contextIsOnline, pendingCount, updatePendingCount } = useOffline();
  const currentlyOffline = !isOnline();
  
  // 🔧 V6 FIX: Submit-Lock verhindert mehrfaches Speichern
  const submitLockRef = useRef(false);
  
  const [tab, setTab] = useState("scan");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Form
  const [consumption, setConsumption] = useState("0");
  const [trapState, setTrapState] = useState(0);
  const [quantity, setQuantity] = useState("none");
  const [status, setStatus] = useState("green");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // History
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [historyOffline, setHistoryOffline] = useState(false);

  // GPS für Mini-Karte
  const [userPosition, setUserPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [distance, setDistance] = useState(null);

  // State für Bestätigungsdialog
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);

  // State für Box-Transfer
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferObjects, setTransferObjects] = useState([]);
  const [selectedTargetObject, setSelectedTargetObject] = useState(null);

  // Box-Info
  const boxInfo = getBoxDisplayInfo(box);
  const typeName = box?.box_types?.name || box?.box_type_name || "Unbekannt";
  const boxType = detectBoxType(box);
  
  const isFloorplanBox = box?.position_type === 'floorplan' || box?.floor_plan_id;
  const hasGPS = box?.lat && box?.lng && !isFloorplanBox;
  const boxPosition = hasGPS ? [parseFloat(box.lat), parseFloat(box.lng)] : null;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // GPS Position für Mini-Karte
  useEffect(() => {
    if (!hasGPS) return;
    if (!isMobile) {
      setDistance(null);
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
        setGpsError("GPS nicht verfügbar");
        setDistance(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasGPS, box?.lat, box?.lng, isMobile]);

  // Status automatisch berechnen
  useEffect(() => {
    const newStatus = autoStatus(boxType, consumption, quantity, trapState);
    setStatus(newStatus);
  }, [consumption, quantity, trapState, boxType]);

  // 🆕 History laden - OFFLINE-FÄHIG
  useEffect(() => {
    loadHistory();
  }, [box?.id]);

  const loadHistory = async () => {
    if (!box?.id) return;
    setHistLoading(true);
    
    try {
      const result = await getBoxHistory(box.id, 20);
      
      if (result.success) {
        setHistory(result.data || []);
        setHistoryOffline(result.offline || false);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error('History load error:', e);
      setHistory([]);
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

  // 🔧 V6 FIX: Submit mit Lock - VERHINDERT 3X SPEICHERN
  const submit = async () => {
    // 🔧 Sofort prüfen und sperren
    if (submitLockRef.current) {
      console.log("⚠️ Submit bereits aktiv (Lock), ignoriere");
      return;
    }
    if (loading) {
      console.log("⚠️ Submit bereits aktiv (Loading), ignoriere");
      return;
    }
    
    // Lock setzen BEVOR alles andere
    submitLockRef.current = true;
    setLoading(true);
    
    console.log("💾 Starte Speichern...");
    
    try {
      const scanData = {
        box_id: box.id,
        object_id: box.object_id || box.objects?.id || "",
        status: status,
        notes: notes
      };
      
      // Typ-spezifische Felder
      if (boxType === "schlagfalle") {
        scanData.trap_state = trapState;
      } else if (boxType === "monitoring_insect") {
        scanData.quantity = quantity;
      } else {
        scanData.consumption = consumption;
      }

      // 🆕 Offline-fähigen API-Call nutzen
      const result = await createScanOffline(scanData, photo);

      if (result.success) {
        console.log("✅ Erfolgreich gespeichert:", result.online ? "online" : "offline");
        
        // Toast anzeigen
        if (result.online) {
          setToast({ type: "success", msg: "Kontrolle gespeichert!" });
        } else {
          setToast({ type: "success", msg: "📴 Offline gespeichert - wird synchronisiert" });
        }
        
        // Pending Count aktualisieren
        if (updatePendingCount) {
          updatePendingCount();
        }
        
        // 🔧 NUR EINMAL callback aufrufen
        setTimeout(() => { 
          if (onScanCreated) {
            onScanCreated();
          } else if (onSave) {
            onSave();
          }
        }, 600);
      } else {
        throw new Error(result.message || "Fehler beim Speichern");
      }
    } catch (e) {
      console.error("❌ Speichern fehlgeschlagen:", e);
      setToast({ type: "error", msg: e.message });
      // Bei Fehler: Lock wieder freigeben damit User erneut versuchen kann
      submitLockRef.current = false;
      setLoading(false);
    }
  };

  // 🆕 Return to Storage Handler - OFFLINE-FÄHIG
  const handleReturnToStorage = async () => {
    setReturnLoading(true);
    try {
      const result = await returnBoxToPool(box.id);

      if (result.success) {
        if (result.online) {
          setToast({ type: "success", msg: "Box zurück ins Lager!" });
        } else {
          setToast({ type: "success", msg: "📴 Wird bei Verbindung zurückgesetzt" });
        }
        
        setShowReturnConfirm(false);
        
        // Pending Count aktualisieren
        if (updatePendingCount) {
          updatePendingCount();
        }
        
        setTimeout(() => {
          if (onReturnToStorage) {
            onReturnToStorage(box);
          } else if (onSave) {
            onSave();
          } else {
            onClose();
          }
        }, 600);
      } else {
        throw new Error(result.message || "Fehler beim Zurücksetzen");
      }
    } catch (e) {
      setToast({ type: "error", msg: e.message });
    } finally {
      setReturnLoading(false);
    }
  };

  // 🆕 Box Transfer Handlers
  const handleOpenTransferDialog = async () => {
    try {
      // Fetch all objects for selection
      const token = localStorage.getItem("trapmap_token");
      const API = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${API}/objects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current object and Pool
        const availableObjects = data.filter(obj => 
          obj.id !== box.object_id && obj.id !== null
        );
        setTransferObjects(availableObjects);
        setShowTransferDialog(true);
      } else {
        setToast({ type: "error", msg: "Objekte konnten nicht geladen werden" });
      }
    } catch (e) {
      console.error("Error loading objects:", e);
      setToast({ type: "error", msg: "Fehler beim Laden der Objekte" });
    }
  };

  const handleTransferBox = async () => {
    if (!selectedTargetObject) {
      setToast({ type: "error", msg: "Bitte wähle ein Zielobjekt" });
      return;
    }

    setTransferLoading(true);
    try {
      const token = localStorage.getItem("trapmap_token");
      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API}/boxes/${box.id}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target_object_id: selectedTargetObject })
      });

      if (response.ok) {
        setToast({ type: "success", msg: "Box erfolgreich verschoben!" });
        setShowTransferDialog(false);
        
        setTimeout(() => {
          if (onSave) {
            onSave();
          } else {
            onClose();
          }
        }, 600);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Fehler beim Verschieben");
      }
    } catch (e) {
      console.error("Transfer error:", e);
      setToast({ type: "error", msg: e.message });
    } finally {
      setTransferLoading(false);
    }
  };

  const getUserName = (scan) => {
    // 🆕 Offline-Scans kennzeichnen
    if (scan.offline || scan.pending) {
      return scan.users?.email?.split('@')[0] || "Du (offline)";
    }
    
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
          padding: "8px 16px", borderRadius: 6, zIndex: 10003,
          background: toast.type === "success" ? "#238636" : "#da3633",
          color: "#fff", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6
        }}>
          {toast.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          {toast.msg}
        </div>
      )}

      {/* BESTÄTIGUNGSDIALOG */}
      {showReturnConfirm && (
        <ConfirmReturnDialog
          box={box}
          onConfirm={handleReturnToStorage}
          onCancel={() => setShowReturnConfirm(false)}
          loading={returnLoading}
          isOffline={currentlyOffline}
        />
      )}

      {/* BOX TRANSFER DIALOG */}
      {showTransferDialog && (
        <BoxTransferDialog
          box={box}
          objects={transferObjects}
          selectedObjectId={selectedTargetObject}
          onSelectObject={setSelectedTargetObject}
          onConfirm={handleTransferBox}
          onCancel={() => {
            setShowTransferDialog(false);
            setSelectedTargetObject(null);
          }}
          loading={transferLoading}
        />
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
          
          {/* Header */}
          <div style={{
            padding: "10px 14px", background: "#161b22",
            borderBottom: "1px solid #21262d",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 6,
                background: STATUS[box?.current_status]?.color || "#1f6feb",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12, color: "#fff"
              }}>
                {box?.short_code || "XX"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3", display: "flex", alignItems: "center", gap: 8 }}>
                  {box?.short_code ? getBoxLabel(box) : (boxInfo.hasName ? boxInfo.boxName : `Box #${boxInfo.displayNumber}`)}
                  
                  {/* 🆕 Offline-Badge im Header */}
                  {currentlyOffline && (
                    <span style={{
                      padding: "2px 6px", background: "rgba(234, 179, 8, 0.2)",
                      borderRadius: 4, fontSize: 9, color: "#eab308",
                      display: "flex", alignItems: "center", gap: 3
                    }}>
                      <WifiOff size={9} /> Offline
                    </span>
                  )}
                  
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
                
                <div style={{ fontSize: 11, color: "#8b949e", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{typeName}</span>
                  
                  {box?.qr_code && (
                    <span style={{ 
                      background: "#30363d", padding: "1px 6px", borderRadius: 4, 
                      fontSize: 10, fontFamily: "monospace",
                      display: "flex", alignItems: "center", gap: 3
                    }}>
                      <Hash size={9} />
                      {box.qr_code}
                    </span>
                  )}
                  
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
              {historyOffline && <WifiOff size={10} style={{ color: "#eab308" }} />}
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {tab === "scan" ? (
              <>
                {/* 🆕 Offline Indicator */}
                <OfflineIndicator isOffline={currentlyOffline} pendingCount={pendingCount} />
                
                {/* Mini-Karte für GPS-Boxen */}
                {hasGPS && boxPosition && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ 
                      height: 120, borderRadius: 8, overflow: "hidden",
                      border: "1px solid #30363d", position: "relative"
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
                        <TileLayer 
                          url={theme === 'dark' 
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          }
                          maxNativeZoom={17}
                          maxZoom={20}
                        />
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

                    {/* Distanz-Anzeige */}
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
                    <MapPin size={16} style={{ color: "#8b5cf6" }} />
                    <div>
                      <div style={{ fontSize: 12, color: "#c4b5fd", fontWeight: 500 }}>
                        Position: {box.grid_position}
                      </div>
                      {box.floor_plans?.name && (
                        <div style={{ fontSize: 10, color: "#8b949e" }}>
                          {box.floor_plans.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status-Buttons basierend auf BoxType */}
                {boxType === "schlagfalle" ? (
                  /* Schlagfallen: 3 Zustände */
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6, fontWeight: 500 }}>Zustand</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { val: 0, label: "OK", icon: "✓", bg: "#238636" },
                        { val: 1, label: "Ausgelöst", icon: "⚠️", bg: "#9e6a03" },
                        { val: 2, label: "Tier", icon: "🐀", bg: "#da3633" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setTrapState(opt.val)}
                          style={{
                            flex: 1, padding: "10px 8px", borderRadius: 6,
                            border: trapState === opt.val ? `2px solid ${opt.bg}` : "1px solid #30363d",
                            background: trapState === opt.val ? `${opt.bg}20` : "#161b22",
                            color: trapState === opt.val ? opt.bg : "#8b949e",
                            fontSize: 11, fontWeight: 500, cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : boxType === "monitoring_insect" ? (
                  /* Insekten-Monitoring: Anzahl-Auswahl */
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6, fontWeight: 500 }}>Insekten-Anzahl</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[
                        { val: "none", label: "Keine", color: "#238636" },
                        { val: "0-5", label: "0-5", color: "#9e6a03" },
                        { val: "5-10", label: "5-10", color: "#bd561d" },
                        { val: "10-20", label: "10-20", color: "#da3633" },
                        { val: "20+", label: "20+", color: "#da3633" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setQuantity(opt.val)}
                          style={{
                            flex: 1, minWidth: 50, padding: "8px 6px", borderRadius: 6,
                            border: quantity === opt.val ? `2px solid ${opt.color}` : "1px solid #30363d",
                            background: quantity === opt.val ? `${opt.color}20` : "#161b22",
                            color: quantity === opt.val ? opt.color : "#8b949e",
                            fontSize: 11, fontWeight: 500, cursor: "pointer"
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard: Consumption Slider */
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ 
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginBottom: 8
                    }}>
                      <span style={{ fontSize: 11, color: "#8b949e", fontWeight: 500 }}>Köderaufnahme</span>
                      <span style={{ 
                        fontSize: 13, fontWeight: 700, 
                        color: STATUS[status]?.color || "#8b949e"
                      }}>
                        {consumption}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={consumption}
                      onChange={(e) => setConsumption(e.target.value)}
                      style={{ width: "100%", accentColor: STATUS[status]?.color }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "#238636" }}>0%</span>
                      <span style={{ fontSize: 10, color: "#da3633" }}>100%</span>
                    </div>
                  </div>
                )}

                {/* Status Preview */}
                <div style={{
                  marginBottom: 14, padding: "10px 12px",
                  background: `${STATUS[status]?.color}15`,
                  border: `1px solid ${STATUS[status]?.color}40`,
                  borderRadius: 8, display: "flex", alignItems: "center", gap: 10
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: STATUS[status]?.color
                  }} />
                  <span style={{ fontSize: 12, color: STATUS[status]?.color, fontWeight: 600 }}>
                    Status: {STATUS[status]?.label}
                  </span>
                </div>

                {/* Notizen */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6, fontWeight: 500 }}>Notizen</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional: Auffälligkeiten, Maßnahmen..."
                    rows={2}
                    style={{
                      width: "100%", padding: 10, borderRadius: 6,
                      background: "#161b22", border: "1px solid #30363d",
                      color: "#e6edf3", fontSize: 12, resize: "vertical",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Foto */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 6, fontWeight: 500 }}>Foto</div>
                  {photoPreview ? (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img src={photoPreview} alt="Preview" style={{
                        maxWidth: "100%", maxHeight: 120, borderRadius: 6,
                        border: "1px solid #30363d"
                      }}/>
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
              /* History Tab */
              <>
                {/* 🆕 History Offline-Hinweis */}
                {historyOffline && (
                  <div style={{
                    marginBottom: 10, padding: "8px 12px",
                    background: "rgba(234, 179, 8, 0.1)",
                    border: "1px solid rgba(234, 179, 8, 0.2)",
                    borderRadius: 6, fontSize: 11, color: "#eab308",
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                    <WifiOff size={12} />
                    Offline - zeigt gecachte Daten
                  </div>
                )}
                
                {histLoading ? (
                  <div style={{ textAlign: "center", color: "#8b949e", padding: 24, fontSize: 12 }}>Lade...</div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#8b949e", padding: 24, fontSize: 12 }}>Keine Kontrollen</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {history.map((s, i) => (
                      <div key={s.id || i} style={{
                        padding: "12px", background: "#161b22", borderRadius: 6, border: "1px solid #21262d",
                        // 🆕 Offline-Scans visuell markieren
                        ...(s.offline || s.pending ? { borderColor: "rgba(234, 179, 8, 0.3)" } : {})
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS[s.status]?.color || "#8b949e" }}/>
                          <div style={{ flex: 1, fontSize: 12, color: "#e6edf3", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            {new Date(s.scanned_at || s.created_at || s.offline_created_at).toLocaleDateString("de-DE", {
                              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                            {/* 🆕 Pending Badge */}
                            {(s.offline || s.pending) && (
                              <span style={{
                                padding: "1px 5px", background: "rgba(234, 179, 8, 0.2)",
                                borderRadius: 3, fontSize: 9, color: "#eab308"
                              }}>
                                ⏳ Pending
                              </span>
                            )}
                          </div>
                          {s.consumption !== undefined && s.consumption !== null && (
                            <div style={{ fontSize: 11, color: "#8b949e", background: "#21262d", padding: "2px 8px", borderRadius: 4 }}>
                              {s.consumption}%
                            </div>
                          )}
                          {s.trap_state !== undefined && s.trap_state !== null && (
                            <div style={{ 
                              fontSize: 11, 
                              color: s.trap_state === 0 ? "#3fb950" : s.trap_state === 1 ? "#d29922" : "#f85149", 
                              background: "#21262d", padding: "2px 8px", borderRadius: 4 
                            }}>
                              {s.trap_state === 0 ? "✓ OK" : s.trap_state === 1 ? "⚠️ Ausgelöst" : "🐀 Tier"}
                            </div>
                          )}
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
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {tab === "scan" && (
            <div style={{ padding: "12px 14px", background: "#161b22", borderTop: "1px solid #21262d" }}>
              <button onClick={submit} disabled={loading || submitLockRef.current} style={{
                width: "100%", padding: "11px", borderRadius: 6, border: "none",
                background: loading ? "#21262d" : "#238636", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
                {currentlyOffline && <WifiOff size={12} />}
                <Save size={14}/> {loading ? "Speichern..." : currentlyOffline ? "Offline speichern" : "Kontrolle speichern"}
              </button>
              
              {/* Return to Storage Button */}
              {box?.object_id && (
                <button 
                  onClick={() => setShowReturnConfirm(true)} 
                  disabled={loading}
                  style={{
                    width: "100%", padding: "11px", borderRadius: 6, 
                    border: "1px solid #30363d",
                    background: "transparent", color: "#ef4444",
                    fontSize: 12, fontWeight: 500, 
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    marginTop: 8, transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                      e.currentTarget.style.borderColor = "#ef4444";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#30363d";
                  }}
                >
                  <Archive size={14}/> Zurück ins Lager
                </button>
              )}

              {/* Transfer to Another Object Button */}
              {box?.object_id && (
                <button 
                  onClick={handleOpenTransferDialog} 
                  disabled={loading}
                  style={{
                    width: "100%", padding: "11px", borderRadius: 6, 
                    border: "1px solid #30363d",
                    background: "transparent", color: "#3b82f6",
                    fontSize: 12, fontWeight: 500, 
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    marginTop: 8, transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                      e.currentTarget.style.borderColor = "#3b82f6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#30363d";
                  }}
                >
                  <ArrowRight size={14}/> Zu anderem Objekt verschieben
                </button>
              )}
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