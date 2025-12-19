/* ============================================================
   TRAPMAP - MAPS V13 - MIT OFFLINE-SUPPORT
   - Bottom Sheet für Mobile (Slide-Up Panel)
   - Dynamische display_number pro Objekt (1, 2, 3...)
   - FlyTo Button für GPS-Boxen
   - QR-Nummer als Badge
   - OFFLINE-FÄHIG: Daten aus IndexedDB Cache
   ============================================================ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getBoxShortLabel, getBoxLabel } from "../../utils/boxUtils";

// 🆕 Offline API Imports
import { 
  getObjects, 
  getBoxesByObject, 
  getBoxTypes, 
  getPoolBoxes,
  isOnline 
} from "../../utils/offlineAPI";
import { useOffline } from "../../context/OfflineContext";

import { 
  Plus, Layers3, X, Search, MapPin, Building2, 
  ChevronLeft, ChevronRight, Map, LayoutGrid, Navigation,
  ChevronDown, Clock, User, Package, ArrowRight, List, Archive, WifiOff
} from "lucide-react";
import "./Maps.css";

// Components
import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "./BoxEditDialog";
import ObjectCreateDialog from "./ObjectCreateDialog";
import ObjectEditDialog from "./ObjectEditDialog";

// Box Helpers - NEUE IMPORTS
import { 
  calculateDisplayNumbers, 
  getShortQr, 
  isGpsBox, 
  isFloorplanBox,
  getStatusColor as getStatusColorHelper 
} from "../../components/boxes/BoxHelpers";

// Logo - optional, mit Fallback
let logoImg = null;
try {
  logoImg = new URL("../../assets/trapmap-logo-200.png", import.meta.url).href;
} catch (e) {
  // Logo nicht vorhanden
}

/* ENV */
const API = import.meta.env.VITE_API_URL;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ============================================================
   MAPBOX TILE URLS
   ============================================================ */
// 512px Tiles für 4x weniger Requests
const MAPBOX_STREETS = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_SAT = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;

/* ============================================================
   MOBILE DETECTION
   ============================================================ */
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || 'ontouchstart' in window;
};

/* ============================================================
   ICONS
   ============================================================ */

// Objekt-Farbe basierend auf Befalls-Score
const getObjectStatusColor = (avgScore) => {
  if (avgScore === null || avgScore === undefined) return '#9CA3AF'; // Grau
  if (avgScore <= 0.5) return '#22C55E'; // Grün
  if (avgScore <= 1.2) return '#EAB308'; // Gelb
  if (avgScore <= 2.0) return '#F97316'; // Orange
  return '#EF4444'; // Rot
};

const createObjectIcon = (object) => {
  const color = getObjectStatusColor(object?.avg_score);
  const initial = object?.name?.charAt(0)?.toUpperCase() || 'O';
  
  return L.divIcon({
    html: `<div style="background: ${color}; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <div style="transform: rotate(45deg); color: white; font-size: 18px; font-weight: bold;">${initial}</div>
    </div>`,
    className: "custom-object-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "green" || s === "ok") return "green";
  if (s === "yellow" || s.includes("gering")) return "yellow";
  if (s === "orange" || s.includes("auffällig")) return "orange";
  if (s === "red" || s.includes("befall")) return "red";
  return "gray";
};

const getStatusHex = (status) => {
  const colors = {
    green: "#10b981",
    yellow: "#eab308",
    orange: "#fb923c",
    red: "#dc2626",
    gray: "#6b7280",
    blue: "#3b82f6",
  };
  return colors[getStatusColor(status)] || colors.gray;
};

const getBoxIcon = (box) => {
  const typeName = (box.box_type_name || "").toLowerCase();
  if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
  if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("rodent") || typeName.includes("nager") || typeName.includes("köder") || typeName.includes("ratte") || typeName.includes("maus")) return "R";
  if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("käfer")) return "I";
  if (typeName.includes("uv") || typeName.includes("licht")) return "L";
  return "B";
};

// Marker mit short_code+number Label oben und Kürzel im Kreis
const createBoxIcon = (box, status = "green") => {
  const color = getStatusHex(status);
  // Immer getBoxShortLabel verwenden - extrahiert Nummer aus QR-Code
  const label = getBoxShortLabel(box);
  const shortCode = box?.short_code || getBoxIcon(box);

  return L.divIcon({
    html: `
      <div class="box-marker-container">
        <div class="box-qr-label">${label}</div>
        <div class="box-circle" style="background-color: ${color}">
          <span class="box-display-number">${shortCode}</span>
        </div>
      </div>
    `,
    className: "box-marker-wrapper",
    iconSize: [40, 50],
    iconAnchor: [20, 25], // Zentriert auf den Kreis statt auf die Spitze
    popupAnchor: [0, -25],
  });
};

/* ============================================================
   BOX MARKER - Mit short_code-number Label
   ============================================================ */
function BoxMarker({ box, onClick }) {
  // Validierung der Koordinaten - prüft null/undefined aber erlaubt 0
  if (box.lat == null || box.lng == null || isNaN(box.lat) || isNaN(box.lng)) {
    console.warn('Invalid coordinates for box:', box.id, box.lat, box.lng);
    return null;
  }
  
  // Koordinaten als Zahlen konvertieren
  const lat = parseFloat(box.lat);
  const lng = parseFloat(box.lng);
  
  return (
    <Marker
      position={[lat, lng]}
      icon={createBoxIcon(box, box.current_status || box.status)}
      eventHandlers={{ click: () => onClick(box) }}
    />
  );
}

/* ============================================================
   OBJECT MARKER - MIT BEFALLSFARBE
   ============================================================ */
function ObjectMarkerComponent({ object, isSelected, onSelect }) {
  return (
    <Marker
      position={[object.lat, object.lng]}
      icon={createObjectIcon(object)}
      eventHandlers={{ click: () => onSelect(object) }}
    />
  );
}

/* ============================================================
   COLLAPSIBLE BOX SECTION
   ============================================================ */
function CollapsibleBoxSection({ title, icon, count, variant = "default", defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantClasses = {
    default: "",
    warning: "variant-warning",
    map: "variant-map",
    floorplan: "variant-floorplan"
  };

  return (
    <div className={`collapsible-section ${variantClasses[variant]} ${isOpen ? 'open' : 'closed'}`}>
      <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="header-left">
          {icon}
          <span className="header-title">{title}</span>
        </div>
        <div className="header-right">
          <span className="header-count">{count}</span>
          <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   BOX LIST ITEM - Mit display_number, QR-Badge und FlyTo
   ============================================================ */
function BoxListItem({ box, onClick, onFlyTo, onReturnToStorage, showFlyTo = false, isFloorplan = false }) {
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

  const boxLabel = getBoxShortLabel(box); // z.B. "RK123" oder "IM456"
  const shortQr = getShortQr(box);
  const statusColor = getStatusColor(box.current_status || box.status);
  const canFlyTo = showFlyTo && isGpsBox(box) && onFlyTo;

  return (
    <div className={`box-item-detailed ${isFloorplan ? 'floorplan' : ''} group`} onClick={onClick}>
      <div className="box-item-main">
        <div className={`box-number-badge ${statusColor}`}>
          {boxLabel}
        </div>
        <div className="box-item-info">
          <div className="box-item-name">
            <span>Box {boxLabel}</span>
            <span className="qr-badge">{shortQr}</span>
            {isFloorplan && <LayoutGrid size={12} className="floorplan-badge" />}
          </div>
          <div className="box-item-meta">
            <span className="box-type">{box.box_type_name || 'Kein Typ'}</span>
            <span className="last-scan">
              <Clock size={11} />
              {formatLastScan(box.last_scan)}
            </span>
          </div>
        </div>
      </div>
      <div className="box-item-right">
        {onReturnToStorage && (
          <button 
            className="return-storage-btn"
            onClick={(e) => {
              e.stopPropagation();
              onReturnToStorage(box);
            }}
            title="Zurück ins Lager"
          >
            <Archive size={14} />
          </button>
        )}
        {canFlyTo && (
          <button 
            className="flyto-btn"
            onClick={(e) => {
              e.stopPropagation();
              onFlyTo(box);
            }}
            title="Zur Box fliegen"
          >
            <Navigation size={14} />
          </button>
        )}
        <span className={`status-indicator ${statusColor}`} />
        <ChevronRight size={14} className="item-chevron" />
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function Maps() {
  const token = localStorage.getItem("trapmap_token");
  const userStr = localStorage.getItem("trapmap_user");
  const user = userStr ? JSON.parse(userStr) : null;
  const canEdit = user?.role === "admin" || user?.role === "supervisor" || user?.role === "editor";
  const navigate = useNavigate();
  
  // 🆕 Offline-Context nutzen
  const { isOffline } = useOffline();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlObjectId = searchParams.get("object_id");
  const urlFlyTo = searchParams.get("flyTo") === "true";
  const urlOpenBox = searchParams.get("openBox");
  const urlFirstSetup = searchParams.get("firstSetup") === "true";

  // Data
  const [objects, setObjects] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);
  const [poolBoxes, setPoolBoxes] = useState([]);

  // Selected
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  // UI State
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [boxEditDialogOpen, setBoxEditDialogOpen] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [objectCreateDialogOpen, setObjectCreateDialogOpen] = useState(false);
  const [objectEditDialogOpen, setObjectEditDialogOpen] = useState(false);
  const [floorplanDialogOpen, setFloorplanDialogOpen] = useState(false);
  const [pendingFloorplanBox, setPendingFloorplanBox] = useState(null);
  const [returnStorageDialogOpen, setReturnStorageDialogOpen] = useState(false);
  const [boxToReturn, setBoxToReturn] = useState(null);
  const [returningBox, setReturningBox] = useState(false);

  // Mobile Bottom Sheet State
  const [isMobile, setIsMobile] = useState(isMobileDevice());
  const [sheetState, setSheetState] = useState('peek');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Sheet drag state
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);

  // Lager-Anforderung State
  const [requestCount, setRequestCount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState(null);

  // Click-to-Place Modus
  const [boxToPlace, setBoxToPlace] = useState(null);

  // Map
  const [mapStyle, setMapStyle] = useState("streets");
  const [styleOpen, setStyleOpen] = useState(false);

  // Placing
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [tempObjectLatLng, setTempObjectLatLng] = useState(null);
  const [repositionBox, setRepositionBox] = useState(null);

  // Search
  const [objectSearchQuery, setObjectSearchQuery] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const addressTimeoutRef = useRef(null);

  // Drag & Drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const mapRef = useRef(null);
  const mapWrapperRef = useRef(null);

  /* ============================================================
     RESPONSIVE HANDLING
     ============================================================ */
  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      if (!mobile) {
        setSheetState('peek');
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ============================================================
     SHEET DRAG HANDLERS (Mobile)
     ============================================================ */
  const handleSheetDragStart = useCallback((e) => {
    if (!isMobile) return;
    
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    isDragging.current = true;
    
    const sheet = sheetRef.current;
    if (sheet) {
      dragStartHeight.current = sheet.offsetHeight;
    }
  }, [isMobile]);

  const handleSheetDrag = useCallback((e) => {
    if (!isDragging.current || !isMobile) return;

    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        if (sheetState === 'peek') setSheetState('half');
        else if (sheetState === 'half') setSheetState('full');
      } else {
        if (sheetState === 'full') setSheetState('half');
        else if (sheetState === 'half') setSheetState('peek');
        else if (sheetState === 'peek') setSheetState('closed');
      }
      isDragging.current = false;
    }
  }, [isMobile, sheetState]);

  const handleSheetDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleSheetToggle = useCallback(() => {
    if (!isMobile) return;
    
    if (sheetState === 'peek') setSheetState('half');
    else if (sheetState === 'half') setSheetState('full');
    else if (sheetState === 'full') setSheetState('half');
    else setSheetState('peek');
  }, [isMobile, sheetState]);

  /* ============================================================
     LOAD DATA - 🆕 MIT OFFLINE-SUPPORT
     ============================================================ */
  const loadObjects = useCallback(async () => {
    try {
      const result = await getObjects();
      
      if (result.success) {
        const arr = result.data || [];
        arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de"));
        setObjects(arr);
        
        if (result.offline) {
          console.log("📴 Objekte aus Cache geladen:", arr.length);
        }
      } else {
        console.error("❌ Fehler beim Laden der Objekte");
      }
    } catch (e) {
      console.error("❌ Fehler beim Laden der Objekte:", e);
    }
  }, []);

  const loadBoxes = useCallback(async (objectId) => {
    try {
      const result = await getBoxesByObject(objectId);
      
      if (result.success) {
        let boxesData = result.data || [];
        
        // display_number berechnen
        const boxesWithNumbers = calculateDisplayNumbers(boxesData);
        setBoxes(boxesWithNumbers);
        
        if (result.offline) {
          console.log("📴 Boxen aus Cache geladen:", boxesData.length);
        }
      } else {
        setBoxes([]);
      }
    } catch (e) {
      console.error("❌ Fehler beim Laden der Boxen:", e);
      setBoxes([]);
    }
  }, []);

  const loadBoxTypes = useCallback(async () => {
    try {
      const result = await getBoxTypes();
      
      if (result.success) {
        setBoxTypes(result.data || []);
        
        if (result.offline) {
          console.log("📴 BoxTypes aus Cache geladen");
        }
      }
    } catch (e) {
      console.error("❌ Fehler beim Laden der Boxtypen:", e);
    }
  }, []);

  const loadPoolBoxes = useCallback(async () => {
    try {
      const result = await getPoolBoxes();
      
      if (result.success) {
        // Lokale extractNumber Funktion für Pool-Boxen
        const getSequenceNumber = (box) => {
          if (box.sequence_number != null) return box.sequence_number;
          
          const idStr = box.id ? String(box.id) : '';
          const match = idStr.match(/(\d+)$/);
          if (match) return parseInt(match[1], 10);
          return 999999;
        };
        
        const pool = (result.data || []).sort((a, b) => {
          const numA = getSequenceNumber(a);
          const numB = getSequenceNumber(b);
          return numA - numB;
        });
        
        setPoolBoxes(pool);
        
        if (result.offline) {
          console.log("📴 Pool-Boxen aus Cache geladen:", pool.length);
        }
      } else {
        setPoolBoxes([]);
      }
    } catch (e) {
      console.error("❌ Fehler beim Laden der Pool-Boxen:", e);
      setPoolBoxes([]);
    }
  }, []);

  const extractNumber = (qr) => {
    if (qr.sequence_number != null) return qr.sequence_number;
    
    // Sicherstellen dass id ein String ist
    const idStr = qr.id ? String(qr.id) : '';
    const match = idStr.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10);
    return 999999;
  };

  useEffect(() => {
    loadObjects();
    loadBoxTypes();
    loadPoolBoxes();
  }, [loadObjects, loadBoxTypes, loadPoolBoxes]);

  const [skipNextBoxLoad, setSkipNextBoxLoad] = useState(false);

  // URL Parameter handling
  useEffect(() => {
    if (urlObjectId && objects.length > 0) {
      const targetObject = objects.find(obj => String(obj.id) === urlObjectId);
      if (targetObject) {
        setSkipNextBoxLoad(true);
        setSelectedObject(targetObject);
        
        if (isMobile) {
          setSheetState('half');
        }
        
        const loadAndOpenBox = async () => {
          try {
            // 🆕 Offline-fähig
            const result = await getBoxesByObject(targetObject.id);
            let boxesData = result.success ? (result.data || []) : [];
            
            // display_number berechnen
            boxesData = calculateDisplayNumbers(boxesData);
            setBoxes(boxesData);
            
            if (urlFlyTo && targetObject.lat && targetObject.lng) {
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.flyTo([targetObject.lat, targetObject.lng], 18, { duration: 1.5 });
                }
              }, 500);
            }
            
            if (urlOpenBox && boxesData.length > 0) {
              const targetBox = boxesData.find(box => String(box.id) === urlOpenBox);
              if (targetBox) {
                setTimeout(() => {
                  setSelectedBox(targetBox);
                  if (urlFirstSetup) {
                    setIsFirstSetup(true);
                    setBoxEditDialogOpen(true);
                  } else {
                    setControlDialogOpen(true);
                  }
                }, 300);
              }
            }
            
            setSearchParams({});
          } catch (e) {
            console.error("❌ Fehler beim Laden:", e);
          }
        };
        
        loadAndOpenBox();
      }
    }
  }, [urlObjectId, urlFlyTo, urlOpenBox, urlFirstSetup, objects, token, setSearchParams, isMobile]);

  useEffect(() => {
    if (urlOpenBox && !urlObjectId && boxes.length > 0) {
      const targetBox = boxes.find(box => String(box.id) === urlOpenBox);
      if (targetBox) {
        setSelectedBox(targetBox);
        setControlDialogOpen(true);
        setSearchParams({});
      }
    }
  }, [urlOpenBox, urlObjectId, boxes, setSearchParams]);

  useEffect(() => {
    if (selectedObject) {
      if (skipNextBoxLoad) {
        setSkipNextBoxLoad(false);
        return;
      }
      loadBoxes(selectedObject.id);
    } else {
      setBoxes([]);
    }
  }, [selectedObject, loadBoxes, skipNextBoxLoad]);

  /* ============================================================
     FLYTO HANDLER
     ============================================================ */
  const handleFlyToBox = useCallback((box) => {
    if (!box.lat || !box.lng || !mapRef.current) return;
    
    // Auf Mobile: Sheet minimieren
    if (isMobile) {
      setSheetState('peek');
    }
    
    mapRef.current.flyTo([box.lat, box.lng], 19, { duration: 1.2 });
  }, [isMobile]);

  /* ============================================================
     REQUEST BOXES FROM POOL
     ============================================================ */
  const handleRequestBoxes = async () => {
    const count = parseInt(requestCount, 10);
    
    if (isNaN(count) || count < 1) {
      setRequestMessage({ type: "error", text: "Bitte gültige Anzahl eingeben" });
      return;
    }
    
    if (count > 100) {
      setRequestMessage({ type: "error", text: "Maximal 100 Boxen auf einmal" });
      return;
    }
    
    if (!selectedObject) {
      setRequestMessage({ type: "error", text: "Kein Objekt ausgewählt" });
      return;
    }

    if (poolBoxes.length < count) {
      setRequestMessage({ 
        type: "error", 
        text: `Nicht genug Boxen! Verfügbar: ${poolBoxes.length}` 
      });
      return;
    }

    const boxesToAssign = poolBoxes.slice(0, count);
    
    // Extract and validate box IDs before proceeding
    // Multiple fallbacks needed because data structure differs between:
    // - Online API: box.id (from getPoolBoxes transformation in offlineAPI.js)
    // - Cached data: box.boxes?.id or box.box_id (raw QR code structure)
    const boxIds = boxesToAssign
      .map(box => box.id || box.boxes?.id || box.box_id)
      .filter(id => id != null);
    
    if (boxIds.length === 0) {
      console.error("❌ Keine gültigen Box-IDs gefunden:", boxesToAssign);
      setRequestMessage({ type: "error", text: "Keine gültigen Box-IDs gefunden" });
      return;
    }
    
    if (boxIds.length < count) {
      console.warn(`⚠️ Nur ${boxIds.length} von ${count} Boxen haben gültige IDs`);
    }
    
    setRequesting(true);
    setRequestMessage({ type: "info", text: `Weise ${boxIds.length} Boxen zu...` });

    try {
      // Use bulk-assign API for better performance
      const res = await fetch(`${API}/boxes/bulk-assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          box_ids: boxIds,
          object_id: selectedObject.id 
        })
      });

      if (res.ok) {
        const data = await res.json();
        const assignedCount = data.count || boxIds.length;
        setRequestMessage({ type: "success", text: `✓ ${assignedCount} Boxen zugewiesen` });
        console.log(`✅ ${assignedCount} Boxen erfolgreich zugewiesen`);
      } else {
        const error = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        console.error("❌ Bulk-Assign Fehler:", error);
        setRequestMessage({ type: "error", text: error.error || "Fehler beim Zuweisen" });
      }
    } catch (err) {
      console.error("❌ Fehler bei Boxen-Zuweisung:", err);
      setRequestMessage({ type: "error", text: "Netzwerkfehler" });
    }

    setRequestCount("");
    loadBoxes(selectedObject.id);
    loadPoolBoxes();
    setRequesting(false);

    setTimeout(() => setRequestMessage(null), 3000);
  };

  /* ============================================================
     ADDRESS SEARCH
     ============================================================ */
  const handleAddressSearch = useCallback((query) => {
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }

    if (!query || query.length < 3) {
      setAddressResults([]);
      return;
    }

    addressTimeoutRef.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=de&country=de,at,ch&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.features) {
          setAddressResults(data.features.map(f => ({
            place_name: f.place_name,
            center: f.center,
          })));
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        setAddressResults([]);
      } finally {
        setAddressSearching(false);
      }
    }, 300);
  }, []);

  const handleAddressSelect = (result) => {
    if (result.center && mapRef.current) {
      const [lng, lat] = result.center;
      mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    }
    setAddressQuery(result.place_name);
    setAddressResults([]);
  };

  /* ============================================================
     SORTED & FILTERED DATA - Mit display_number
     ============================================================ */
  const filteredObjects = useMemo(() => {
    if (!objectSearchQuery.trim()) return objects;
    const q = objectSearchQuery.toLowerCase();
    return objects.filter(o =>
      o.name?.toLowerCase().includes(q) ||
      o.address?.toLowerCase().includes(q) ||
      o.city?.toLowerCase().includes(q)
    );
  }, [objects, objectSearchQuery]);

  const sortedBoxes = useMemo(() => {
    if (!boxes.length) return { mapBoxes: [], floorplanBoxes: [], unplacedBoxes: [] };

    // Sortieren nach display_number
    const sortByDisplayNumber = (a, b) => (a.display_number || 999) - (b.display_number || 999);

    // Alle Boxen mit GPS-Koordinaten auf die Karte
    const mapBoxes = boxes
      .filter(b => b?.lat != null && b?.lng != null)
      .sort(sortByDisplayNumber);

    const floorplanBoxes = boxes
      .filter(b => isFloorplanBox(b))
      .sort(sortByDisplayNumber);

    const unplacedBoxes = boxes
      .filter(b => {
        const hasCoords = b?.lat != null && b?.lng != null;
        const isOnFloorplan = isFloorplanBox(b);
        return !hasCoords && !isOnFloorplan;
      })
      .sort(sortByDisplayNumber);

    return { mapBoxes, floorplanBoxes, unplacedBoxes };
  }, [boxes]);

  /* ============================================================
     HANDLERS
     ============================================================ */
  const handleObjectClick = (obj) => {
    setSelectedObject(obj);
    setRequestMessage(null);
    setRequestCount("");
    
    if (isMobile) {
      setSheetState('half');
    }
    
    if (obj.lat && obj.lng && mapRef.current) {
      mapRef.current.flyTo([obj.lat, obj.lng], 17, { duration: 1.0 });
    }
  };

  const handleBoxClick = (box) => {
    if (isMobile) {
      setSheetState('peek');
    }
    
    // WICHTIG: Lageplan-Boxen → zum Lageplan navigieren
    if (isFloorplanBox(box)) {
      setPendingFloorplanBox(box);
      setFloorplanDialogOpen(true);
      return;
    }

    setSelectedBox(box);
    const needsSetup = !box.box_type_id;
    if (needsSetup) {
      setIsFirstSetup(true);
      setBoxEditDialogOpen(true);
    } else {
      setIsFirstSetup(false);
      setControlDialogOpen(true);
    }
  };

  const handleGoToFloorplan = () => {
    if (pendingFloorplanBox && selectedObject) {
      // Navigation zur Objekt-Detailseite mit Lageplan-Tab und openBox Parameter
      const searchParams = new URLSearchParams({
        tab: 'layouts',
        openBox: pendingFloorplanBox.id
      });
      navigate(`/objects/${selectedObject.id}?${searchParams.toString()}`);
    }
    setFloorplanDialogOpen(false);
    setPendingFloorplanBox(null);
  };

  const handleBackToObjects = () => {
    setSelectedObject(null);
    setBoxes([]);
    setRequestMessage(null);
    setRequestCount("");
    
    if (isMobile) {
      setSheetState('peek');
    }
  };

  /* ============================================================
     RETURN BOX TO STORAGE HANDLER
     ============================================================ */
  const handleReturnToStorage = (box) => {
    setBoxToReturn(box);
    setReturnStorageDialogOpen(true);
  };

  const confirmReturnToStorage = async () => {
    if (!boxToReturn) return;
    
    setReturningBox(true);
    try {
      const response = await fetch(`${API}/boxes/${boxToReturn.id}/return-to-pool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Success - reload boxes
        if (selectedObject) {
          await loadBoxes(selectedObject.id);
        }
        await loadPoolBoxes();
        
        setReturnStorageDialogOpen(false);
        setBoxToReturn(null);
        
        // Show success notification
        setRequestMessage({ type: "success", text: `Box ${getBoxShortLabel(boxToReturn)} zurück ins Lager` });
        setTimeout(() => setRequestMessage(null), 3000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Fehler beim Zurückgeben');
      }
    } catch (err) {
      console.error('Return to storage error:', err);
      setRequestMessage({ type: "error", text: err.message || 'Fehler beim Zurückgeben' });
      setTimeout(() => setRequestMessage(null), 3000);
    } finally {
      setReturningBox(false);
    }
  };

  /* ============================================================
     DRAG & DROP (Desktop only)
     ============================================================ */
  const handleDragOver = (e) => {
    if (isMobile) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDraggingOver(false);

    const boxData = e.dataTransfer.getData('box');
    if (!boxData) return;

    try {
      const box = JSON.parse(boxData);
      const mapWrapper = mapWrapperRef.current;
      if (!mapWrapper || !mapRef.current) return;

      const rect = mapWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = L.point(x, y);
      const latlng = mapRef.current.containerPointToLatLng(point);

      const res = await fetch(`${API}/boxes/${box.id}/place-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: latlng.lat,
          lng: latlng.lng,
          object_id: selectedObject?.id
        })
      });

      if (res.ok) {
        const placedBox = await res.json();
        const enrichedBox = {
          ...placedBox,
          objects: selectedObject,
          box_types: boxTypes.find(t => t.id === placedBox.box_type_id)
        };

        setSelectedBox(enrichedBox);
        const needsSetup = !placedBox.box_type_id;
        if (needsSetup) {
          setIsFirstSetup(true);
          setBoxEditDialogOpen(true);
        } else {
          setIsFirstSetup(false);
          setControlDialogOpen(true);
        }

        if (selectedObject) loadBoxes(selectedObject.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Fehler beim Platzieren');
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  /* ============================================================
     MAP HANDLERS
     ============================================================ */
  function MapReadyHandler() {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    return null;
  }

  function MapEventsHandler() {
    useMapEvents({
      click(e) {
        if (boxToPlace) {
          handlePlaceBoxOnMap(boxToPlace, e.latlng);
          return;
        }
        if (repositionBox) {
          handleRepositionBox(e.latlng);
          return;
        }
        if (objectPlacingMode) {
          setTempObjectLatLng(e.latlng);
          setObjectCreateDialogOpen(true);
        }
      },
    });
    return null;
  }

  const handlePlaceBoxOnMap = async (box, latlng) => {
    try {
      const res = await fetch(`${API}/boxes/${box.id}/place-map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: latlng.lat,
          lng: latlng.lng,
          object_id: selectedObject?.id
        })
      });

      if (res.ok) {
        const placedBox = await res.json();
        const enrichedBox = {
          ...placedBox,
          objects: selectedObject,
          box_types: boxTypes.find(t => t.id === placedBox.box_type_id)
        };

        setSelectedBox(enrichedBox);
        const needsSetup = !placedBox.box_type_id;
        if (needsSetup) {
          setIsFirstSetup(true);
          setBoxEditDialogOpen(true);
        } else {
          setIsFirstSetup(false);
          setControlDialogOpen(true);
        }

        if (selectedObject) loadBoxes(selectedObject.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Fehler beim Platzieren');
      }
    } catch (err) {
      console.error("Place error:", err);
    }
    setBoxToPlace(null);
  };

  const handleRepositionBox = async (latlng) => {
    if (!repositionBox) return;
    
    // WICHTIG: Prüfen ob Box auf Lageplan ist
    if (isFloorplanBox(repositionBox)) {
      alert("Diese Box ist auf einem Lageplan. GPS kann nicht gesetzt werden!");
      setRepositionBox(null);
      return;
    }
    
    try {
      const res = await fetch(`${API}/boxes/${repositionBox.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: latlng.lat, lng: latlng.lng })
      });
      if (res.ok && selectedObject) loadBoxes(selectedObject.id);
    } catch (err) {
      console.error("Reposition error:", err);
    }
    setRepositionBox(null);
  };

  const getTileUrl = () => {
    if (mapStyle === "satellite" || mapStyle === "hybrid") return MAPBOX_SAT;
    return MAPBOX_STREETS;
  };

  const getSidebarClasses = () => {
    if (isMobile) {
      return `maps-sidebar sheet-${sheetState}`;
    }
    return `maps-sidebar ${sidebarOpen ? 'open' : 'closed'}`;
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="maps-page">
      {/* ============================================================
          HEADER
          ============================================================ */}
      <header className="maps-header-modern">
        <div className="header-left">
          {/* Logo entfernt - nur im DashboardLayout Header */}
        </div>

        <div className="header-center">
          <div className="header-search">
            <MapPin size={18} />
            <input
              type="text"
              placeholder="Adresse suchen..."
              value={addressQuery}
              onChange={(e) => {
                setAddressQuery(e.target.value);
                handleAddressSearch(e.target.value);
              }}
            />
            {addressSearching && <div className="search-spinner" />}
            {addressQuery && !addressSearching && (
              <button onClick={() => { setAddressQuery(""); setAddressResults([]); }} className="search-clear">
                <X size={16} />
              </button>
            )}
            {addressResults.length > 0 && (
              <div className="search-dropdown">
                {addressResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="dropdown-item"
                    onClick={() => handleAddressSelect(result)}
                  >
                    <MapPin size={14} />
                    <span>{result.place_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="header-right">
          {/* 🆕 Offline-Indikator */}
          {isOffline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              <WifiOff size={14} />
              <span>Offline</span>
            </div>
          )}
          
          {canEdit && (
            <button
              className={`header-btn ${objectPlacingMode ? 'active' : ''}`}
              onClick={() => setObjectPlacingMode(!objectPlacingMode)}
            >
              <Plus size={18} />
              <span>Objekt</span>
            </button>
          )}

          {/* 📱 Layer-Switch auch auf Mobile verfügbar */}
          <div className="map-style-toggle">
            <button 
              className="layer-switch-btn"
              onClick={() => setStyleOpen(!styleOpen)}
              title="Karten-Stil wechseln"
            >
              <Layers3 size={isMobile ? 20 : 18} />
              {!isMobile && <span>Layer</span>}
            </button>
            {styleOpen && (
              <div className="style-dropdown">
                <button className={mapStyle === "streets" ? "active" : ""} onClick={() => { setMapStyle("streets"); setStyleOpen(false); }}>
                  🗺️ Straßen
                </button>
                <button className={mapStyle === "satellite" ? "active" : ""} onClick={() => { setMapStyle("satellite"); setStyleOpen(false); }}>
                  🛰️ Satellit
                </button>
                <button className={mapStyle === "hybrid" ? "active" : ""} onClick={() => { setMapStyle("hybrid"); setStyleOpen(false); }}>
                  🌍 Hybrid
                </button>
              </div>
            )}
          </div>

          {!isMobile && (
            <button 
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'flex' }}
            >
              {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>
      </header>

      {/* Placing Hints */}
      {objectPlacingMode && (
        <div className="placing-hint">
          <MapPin size={18} />
          <span>Klicke auf die Karte um ein neues Objekt zu erstellen</span>
          <button onClick={() => setObjectPlacingMode(false)}>
            <X size={16} /> Abbrechen
          </button>
        </div>
      )}

      {repositionBox && (
        <div className="placing-hint reposition">
          <Navigation size={18} />
          <span>Klicke auf die Karte um Box {getBoxShortLabel(repositionBox)} zu verschieben</span>
          <button onClick={() => setRepositionBox(null)}>
            <X size={16} /> Abbrechen
          </button>
        </div>
      )}

      {boxToPlace && (
        <div className="placing-hint" style={{ borderColor: "#10b981", color: "#10b981" }}>
          <MapPin size={18} />
          <span>Tippe auf die Karte um Box {getBoxShortLabel(boxToPlace)} zu platzieren</span>
          <button onClick={() => setBoxToPlace(null)} style={{ background: "rgba(16, 185, 129, 0.15)" }}>
            <X size={16} /> Abbrechen
          </button>
        </div>
      )}

      {/* 📴 Offline Karten-Hinweis */}
      {isOffline && (
        <div className="offline-map-notice">
          <WifiOff size={16} />
          <span>Offline-Modus: Nur gecachte Kartenbereiche verfügbar</span>
        </div>
      )}

      {/* ============================================================
          MAIN CONTENT: Map + Sidebar/Sheet
          ============================================================ */}
      <div className="maps-content">
        {/* MAP */}
        <div 
          className={`map-container ${isDraggingOver ? 'drag-over' : ''}`}
          ref={mapWrapperRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDraggingOver && (
            <div className="drop-zone-indicator">
              <div className="drop-zone-content">📍 Box hier platzieren</div>
            </div>
          )}

          <MapContainer
            center={[51.1657, 10.4515]}
            zoom={6}
            maxZoom={22}              // Erhöht für mehr Zoom (digital)
            zoomControl={false}
            scrollWheelZoom={true}
            preferCanvas={true}       // 🆕 Schnelleres Rendering
            wheelDebounceTime={100}   // 🆕 Zoom-Scroll verzögern
            wheelPxPerZoomLevel={120} // 🆕 Langsameres Zoomen = weniger Tile-Loads
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              key={`base-${mapStyle}`}
              url={getTileUrl()}
              attribution='&copy; Mapbox'
              tileSize={512}
              zoomOffset={-1}
              maxNativeZoom={22} // Mapbox liefert bis Zoom 22
              maxZoom={24}      // Leaflet skaliert darüber hinaus
            />
            {mapStyle === "hybrid" && (
              <TileLayer 
                key="hybrid-labels" 
                url={MAPBOX_STREETS} 
                tileSize={512}
                zoomOffset={-1}
                opacity={0.6} 
                maxNativeZoom={22}
                maxZoom={24}
              />
            )}

            <MapReadyHandler />
            <MapEventsHandler />

            {objects.filter(obj => obj.lat && obj.lng).map((obj) => (
              <ObjectMarkerComponent
                key={obj.id}
                object={obj}
                isSelected={selectedObject?.id === obj.id}
                onSelect={handleObjectClick}
              />
            ))}

            {sortedBoxes.mapBoxes.map((box) => (
              <BoxMarker 
                key={box.id} 
                box={box} 
                onClick={handleBoxClick} 
              />
            ))}
          </MapContainer>

          <div className="zoom-controls">
            <button onClick={() => mapRef.current?.zoomIn()}>+</button>
            <button onClick={() => mapRef.current?.zoomOut()}>−</button>
          </div>

          {/* Mobile Floating Layer Switch */}
          {isMobile && (
            <div className="mobile-layer-switch">
              <button 
                className="layer-toggle-btn"
                onClick={() => setStyleOpen(!styleOpen)}
                aria-label="Karten-Stil wechseln"
              >
                <Layers3 size={20} />
              </button>
              {styleOpen && (
                <div className="layer-dropdown">
                  <button 
                    className={mapStyle === "streets" ? "active" : ""} 
                    onClick={() => { setMapStyle("streets"); setStyleOpen(false); }}
                  >
                    🗺️ Straßen
                  </button>
                  <button 
                    className={mapStyle === "satellite" ? "active" : ""} 
                    onClick={() => { setMapStyle("satellite"); setStyleOpen(false); }}
                  >
                    🛰️ Satellit
                  </button>
                  <button 
                    className={mapStyle === "hybrid" ? "active" : ""} 
                    onClick={() => { setMapStyle("hybrid"); setStyleOpen(false); }}
                  >
                    🌍 Hybrid
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile FAB */}
        {isMobile && sheetState === 'closed' && (
          <button 
            className="mobile-fab"
            onClick={() => setSheetState('peek')}
          >
            <List size={18} />
            {selectedObject ? `${boxes.length} Boxen` : `${objects.length} Objekte`}
          </button>
        )}

        {/* ============================================================
            SIDEBAR / BOTTOM SHEET
            ============================================================ */}
        <aside 
          ref={sheetRef}
          className={getSidebarClasses()}
        >
          {isMobile && (
            <>
              <div 
                className="sheet-drag-handle"
                onTouchStart={handleSheetDragStart}
                onTouchMove={handleSheetDrag}
                onTouchEnd={handleSheetDragEnd}
                onClick={handleSheetToggle}
              />
              
              {/* 📱 Mobile Controls: Address Search & Create Object */}
              <div className="mobile-sheet-controls">
                {/* Address Search */}
                <div className={`mobile-search-wrapper ${mobileSearchExpanded ? 'expanded' : ''}`}>
                  {!mobileSearchExpanded ? (
                    <button 
                      className="mobile-search-toggle"
                      onClick={() => setMobileSearchExpanded(true)}
                      aria-label="Adresssuche öffnen"
                    >
                      <Search size={18} />
                      <span>Adresse suchen</span>
                    </button>
                  ) : (
                    <div className="mobile-search-input">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Adresse suchen..."
                        value={addressQuery}
                        onChange={(e) => {
                          setAddressQuery(e.target.value);
                          handleAddressSearch(e.target.value);
                        }}
                        autoFocus
                      />
                      {addressSearching && <div className="search-spinner" />}
                      <button 
                        onClick={() => { 
                          setAddressQuery(""); 
                          setAddressResults([]); 
                          setMobileSearchExpanded(false);
                        }} 
                        className="search-close"
                        aria-label="Suche schließen"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                  {mobileSearchExpanded && addressResults.length > 0 && (
                    <div className="mobile-search-results">
                      {addressResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="result-item"
                          onClick={() => {
                            handleAddressSelect(result);
                            setMobileSearchExpanded(false);
                          }}
                        >
                          <MapPin size={14} />
                          <span>{result.place_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create Object Button */}
                {canEdit && (
                  <button
                    className={`mobile-create-object-btn ${objectPlacingMode ? 'active' : ''}`}
                    onClick={() => {
                      setObjectPlacingMode(!objectPlacingMode);
                      if (!objectPlacingMode) {
                        setSheetState('peek');
                      }
                    }}
                    aria-label="Neues Objekt erstellen"
                  >
                    <Plus size={20} />
                    <span>Objekt erstellen</span>
                  </button>
                )}
              </div>
            </>
          )}

          {!selectedObject ? (
            /* OBJEKT-LISTE */
            <>
              <div className="sidebar-header">
                <div className="sidebar-title row">
                  <Building2 size={20} />
                  <h2>Objekte</h2>
                  <span className="count">{filteredObjects.length}</span>
                </div>
              </div>

              {(sheetState !== 'peek' || !isMobile) && (
                <>
                  <div className="sidebar-search">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Objekt suchen..."
                      value={objectSearchQuery}
                      onChange={(e) => setObjectSearchQuery(e.target.value)}
                    />
                    {objectSearchQuery && (
                      <button onClick={() => setObjectSearchQuery("")}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="sidebar-content">
                    {filteredObjects.length === 0 ? (
                      <div className="empty-state">
                        <Building2 size={32} />
                        <p>Keine Objekte gefunden</p>
                      </div>
                    ) : (
                      <div className="object-list">
                        {filteredObjects.map((obj) => (
                          <div
                            key={obj.id}
                            className="object-item"
                            onClick={() => handleObjectClick(obj)}
                          >
                            <div className="object-icon">
                              <Building2 size={18} />
                            </div>
                            <div className="object-info">
                              <h4>{obj.name}</h4>
                              <p>{obj.address}{obj.city ? `, ${obj.city}` : ''}</p>
                            </div>
                            <ChevronRight size={18} className="chevron" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            /* BOX-LISTE für ausgewähltes Objekt */
            <>
              <div className="sidebar-header with-back">
                <button className="back-btn" onClick={handleBackToObjects}>
                  <ChevronLeft size={20} />
                </button>
                <div className="sidebar-title">
                  <h2>{selectedObject.name}</h2>
                  <p>{selectedObject.address}</p>
                </div>
                <button className="edit-btn" onClick={() => setObjectEditDialogOpen(true)}>
                  Bearbeiten
                </button>
              </div>

              {(sheetState !== 'peek' || !isMobile) && (
                <div className="sidebar-content">
                  {/* Boxen aus Lager anfordern */}
                  <div style={{
                    background: "linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    border: "1px solid #3b82f6"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Package size={16} style={{ color: "#60a5fa" }} />
                      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Boxen aus Lager</span>
                    </div>
                    
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Anz."
                        value={requestCount}
                        onChange={(e) => {
                          setRequestCount(e.target.value);
                          setRequestMessage(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleRequestBoxes()}
                        style={{
                          flex: "0 0 60px",
                          padding: "10px 8px",
                          background: "#0f172a",
                          border: "1px solid #374151",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: 16,
                          textAlign: "center"
                        }}
                      />
                      <button
                        onClick={handleRequestBoxes}
                        disabled={requesting || !requestCount}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          minHeight: 44,
                          background: requesting ? "#374151" : "#3b82f6",
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: requesting ? "wait" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          opacity: !requestCount ? 0.5 : 1
                        }}
                      >
                        <ArrowRight size={14} />
                        {requesting ? "..." : "Anfordern"}
                      </button>
                    </div>
                    
                    <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
                      <span style={{ color: "#10b981", fontWeight: 600 }}>{poolBoxes.length}</span> im Lager
                    </div>

                    {requestMessage && (
                      <div style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        background: requestMessage.type === "success" ? "#10b98120" :
                                    requestMessage.type === "error" ? "#ef444420" :
                                    requestMessage.type === "warning" ? "#f59e0b20" : "#3b82f620",
                        borderRadius: 4,
                        color: requestMessage.type === "success" ? "#10b981" :
                               requestMessage.type === "error" ? "#ef4444" :
                               requestMessage.type === "warning" ? "#f59e0b" : "#60a5fa",
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {requestMessage.text}
                      </div>
                    )}
                  </div>

                  {/* Statistik */}
                  <div className="box-stats-row">
                    <div className="stat-item">
                      <span className="stat-value">{boxes.length}</span>
                      <span className="stat-label">Gesamt</span>
                    </div>
                    <div className="stat-item map">
                      <span className="stat-value">{sortedBoxes.mapBoxes.length}</span>
                      <span className="stat-label">Karte</span>
                    </div>
                    <div className="stat-item floorplan">
                      <span className="stat-value">{sortedBoxes.floorplanBoxes.length}</span>
                      <span className="stat-label">Plan</span>
                    </div>
                    <div className="stat-item warning">
                      <span className="stat-value">{sortedBoxes.unplacedBoxes.length}</span>
                      <span className="stat-label">Offen</span>
                    </div>
                  </div>

                  {/* Unplatzierte Boxen */}
                  <CollapsibleBoxSection
                    title="Unplatziert"
                    icon={<MapPin size={16} />}
                    count={sortedBoxes.unplacedBoxes.length}
                    variant="warning"
                    defaultOpen={sortedBoxes.unplacedBoxes.length > 0}
                  >
                    {sortedBoxes.unplacedBoxes.length === 0 ? (
                      <div className="section-empty">Alle Boxen platziert ✓</div>
                    ) : (
                      sortedBoxes.unplacedBoxes.map((box) => (
                        <div
                          key={box.id}
                          className={`box-item unplaced ${boxToPlace?.id === box.id ? 'selected' : ''}`}
                          draggable={!isMobile}
                          onDragStart={(e) => {
                            if (!isMobile) {
                              e.dataTransfer.setData('box', JSON.stringify(box));
                              e.dataTransfer.effectAllowed = 'move';
                            }
                          }}
                          onClick={() => {
                            if (isMobile) {
                              setBoxToPlace(boxToPlace?.id === box.id ? null : box);
                              setSheetState('peek');
                            }
                          }}
                          style={{
                            cursor: isMobile ? 'pointer' : 'grab',
                            background: boxToPlace?.id === box.id ? 'rgba(16, 185, 129, 0.15)' : undefined,
                            borderColor: boxToPlace?.id === box.id ? '#10b981' : undefined
                          }}
                        >
                          <span className="box-icon">{getBoxIcon(box)}</span>
                          <div className="box-info">
                            <h4>{getBoxShortLabel(box)} <span className="qr-badge-small">{getShortQr(box)}</span></h4>
                            <p>{box.box_type_name || 'Kein Typ'}</p>
                          </div>
                          <span className="drag-hint" style={{ color: boxToPlace?.id === box.id ? '#10b981' : undefined }}>
                            {isMobile 
                              ? (boxToPlace?.id === box.id ? '✓ Karte tippen' : '→ Antippen') 
                              : '⇢ Ziehen'}
                          </span>
                        </div>
                      ))
                    )}
                  </CollapsibleBoxSection>

                  {/* Karten-Boxen - MIT FlyTo! */}
                  <CollapsibleBoxSection
                    title="Karte"
                    icon={<Map size={16} />}
                    count={sortedBoxes.mapBoxes.length}
                    variant="map"
                    defaultOpen={true}
                  >
                    {sortedBoxes.mapBoxes.length === 0 ? (
                      <div className="section-empty">Keine Boxen auf der Karte</div>
                    ) : (
                      sortedBoxes.mapBoxes.map((box) => (
                        <BoxListItem 
                          key={box.id} 
                          box={box} 
                          onClick={() => handleBoxClick(box)}
                          onFlyTo={handleFlyToBox}
                          onReturnToStorage={canEdit ? handleReturnToStorage : undefined}
                          showFlyTo={true}
                        />
                      ))
                    )}
                  </CollapsibleBoxSection>

                  {/* Lageplan-Boxen - KEIN FlyTo! */}
                  <CollapsibleBoxSection
                    title="Lageplan"
                    icon={<LayoutGrid size={16} />}
                    count={sortedBoxes.floorplanBoxes.length}
                    variant="floorplan"
                    defaultOpen={sortedBoxes.floorplanBoxes.length > 0}
                  >
                    {sortedBoxes.floorplanBoxes.length === 0 ? (
                      <div className="section-empty">Keine Boxen auf Lageplänen</div>
                    ) : (
                      sortedBoxes.floorplanBoxes.map((box) => (
                        <BoxListItem 
                          key={box.id} 
                          box={box} 
                          onClick={() => handleBoxClick(box)}
                          onReturnToStorage={canEdit ? handleReturnToStorage : undefined}
                          isFloorplan={true}
                          showFlyTo={false}
                        />
                      ))
                    )}
                  </CollapsibleBoxSection>

                  {boxes.length === 0 && (
                    <div className="empty-state">
                      <MapPin size={32} />
                      <p>Keine Boxen vorhanden</p>
                      <small>Boxen oben anfordern oder per QR scannen</small>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* ============================================================
          DIALOGS
          ============================================================ */}
      {returnStorageDialogOpen && boxToReturn && (
        <div className="dialog-overlay" onClick={() => !returningBox && setReturnStorageDialogOpen(false)}>
          <div className="dialog-compact" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
              <Archive size={32} style={{ color: '#ef4444' }} />
            </div>
            <h3>Box zurück ins Lager?</h3>
            <p>
              Möchtest du <strong>Box {getBoxShortLabel(boxToReturn)}</strong> 
              {boxToReturn.box_type_name && <> ({boxToReturn.box_type_name})</>} 
              wirklich zurück ins Lager verschieben?
            </p>
            {(boxToReturn.lat || boxToReturn.lng || isFloorplanBox(boxToReturn)) && (
              <div style={{ 
                marginTop: 12, 
                padding: '8px 12px', 
                background: 'rgba(251, 191, 36, 0.15)', 
                borderRadius: 6,
                border: '1px solid rgba(251, 191, 36, 0.3)',
                fontSize: 13,
                color: '#fbbf24'
              }}>
                ⚠️ Die Box wird von der {isFloorplanBox(boxToReturn) ? 'Lageplan' : 'Karte'}-Position entfernt
              </div>
            )}
            <div className="dialog-buttons">
              <button 
                className="btn-secondary" 
                onClick={() => setReturnStorageDialogOpen(false)}
                disabled={returningBox}
              >
                Abbrechen
              </button>
              <button 
                className="btn-primary" 
                onClick={confirmReturnToStorage}
                disabled={returningBox}
                style={{ 
                  background: '#ef4444',
                  opacity: returningBox ? 0.6 : 1
                }}
              >
                {returningBox ? (
                  <>
                    <div style={{ 
                      width: 14, 
                      height: 14, 
                      border: '2px solid white', 
                      borderTopColor: 'transparent',
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite'
                    }} />
                    Wird verschoben...
                  </>
                ) : (
                  <>
                    <Archive size={16} />
                    Ins Lager
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {floorplanDialogOpen && (
        <div className="dialog-overlay" onClick={() => setFloorplanDialogOpen(false)}>
          <div className="dialog-compact" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon">
              <LayoutGrid size={32} />
            </div>
            <h3>Zum Lageplan?</h3>
            <p>Diese Box ist auf dem Lageplan von <strong>{selectedObject?.name}</strong>.</p>
            <div className="dialog-buttons">
              <button className="btn-secondary" onClick={() => setFloorplanDialogOpen(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleGoToFloorplan}>
                <LayoutGrid size={16} />
                Lageplan
              </button>
            </div>
          </div>
        </div>
      )}

      {controlDialogOpen && selectedBox && (
        <BoxScanDialog
          box={selectedBox}
          onClose={() => { setControlDialogOpen(false); setSelectedBox(null); }}
          onEdit={() => { setIsFirstSetup(false); setBoxEditDialogOpen(true); setControlDialogOpen(false); }}
          onSave={() => { setControlDialogOpen(false); setSelectedBox(null); if (selectedObject) loadBoxes(selectedObject.id); }}
          onReturnToStorage={canEdit ? (box) => {
            setControlDialogOpen(false);
            setSelectedBox(null);
            handleReturnToStorage(box);
          } : undefined}
          onAdjustPosition={(box) => { 
            setControlDialogOpen(false); 
            // NUR für GPS-Boxen!
            if (!isFloorplanBox(box)) {
              setRepositionBox(box); 
            }
            setSelectedBox(null); 
          }}
          // GPS-Funktionen NUR wenn NICHT Lageplan-Box
          onSetGPS={isFloorplanBox(selectedBox) ? undefined : (box) => {
            setControlDialogOpen(false);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    await fetch(`${API}/boxes/${box.id}/place-map`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ 
                        lat: pos.coords.latitude, 
                        lng: pos.coords.longitude,
                        object_id: selectedObject?.id
                      })
                    });
                    if (selectedObject) loadBoxes(selectedObject.id);
                  } catch (err) { console.error(err); }
                },
                (err) => alert("GPS nicht verfügbar"),
                { enableHighAccuracy: true }
              );
            }
            setSelectedBox(null);
          }}
        />
      )}

      {boxEditDialogOpen && selectedBox && (
        <BoxEditDialog
          box={selectedBox}
          boxTypes={boxTypes}
          isFirstSetup={isFirstSetup}
          onClose={() => { setBoxEditDialogOpen(false); setSelectedBox(null); setIsFirstSetup(false); }}
          onSave={() => { setBoxEditDialogOpen(false); setSelectedBox(null); setIsFirstSetup(false); if (selectedObject) loadBoxes(selectedObject.id); }}
          onAdjustPosition={isFloorplanBox(selectedBox) ? undefined : () => { 
            setBoxEditDialogOpen(false); 
            setRepositionBox(selectedBox); 
            setIsFirstSetup(false); 
            setSelectedBox(null); 
          }}
          onSetGPS={isFloorplanBox(selectedBox) ? undefined : () => {
            setBoxEditDialogOpen(false);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    await fetch(`${API}/boxes/${selectedBox.id}/place-map`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ 
                        lat: pos.coords.latitude, 
                        lng: pos.coords.longitude,
                        object_id: selectedObject?.id
                      })
                    });
                    if (selectedObject) loadBoxes(selectedObject.id);
                  } catch (err) { console.error(err); }
                },
                (err) => alert("GPS nicht verfügbar"),
                { enableHighAccuracy: true }
              );
            }
            setSelectedBox(null);
            setIsFirstSetup(false);
          }}
        />
      )}

      {objectCreateDialogOpen && tempObjectLatLng && (
        <ObjectCreateDialog
          latLng={tempObjectLatLng}
          onClose={() => { setObjectCreateDialogOpen(false); setTempObjectLatLng(null); setObjectPlacingMode(false); }}
          onSave={(newObject) => {
            setObjects((prev) => [...prev, newObject].sort((a, b) => (a.name || "").localeCompare(b.name || "", "de")));
            setSelectedObject(newObject);
            setObjectCreateDialogOpen(false);
            setTempObjectLatLng(null);
            setObjectPlacingMode(false);
          }}
        />
      )}

      {objectEditDialogOpen && selectedObject && (
        <ObjectEditDialog
          object={selectedObject}
          boxCount={boxes.length}
          onClose={() => setObjectEditDialogOpen(false)}
          onSave={(updated) => {
            setObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)).sort((a, b) => (a.name || "").localeCompare(b.name || "", "de")));
            setSelectedObject(updated);
            setObjectEditDialogOpen(false);
          }}
          onDelete={(id) => {
            setObjects((prev) => prev.filter((o) => o.id !== id));
            setSelectedObject(null);
            setObjectEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
