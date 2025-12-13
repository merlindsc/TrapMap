/* ============================================================
   TRAPMAP - MAPS V10 - MIT LAGER-ANFORDERUNG
   - "Boxen aus Lager anfordern" in der Objekt-Sidebar
   - Kleinste Nummern zuerst
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

import { 
  Plus, Layers3, X, Search, MapPin, Building2, 
  ChevronLeft, ChevronRight, Map, LayoutGrid, Navigation,
  ChevronDown, Clock, User, Package, ArrowRight
} from "lucide-react";
import "./Maps.css";

// Components
import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "./BoxEditDialog";
import ObjectCreateDialog from "./ObjectCreateDialog";
import ObjectEditDialog from "./ObjectEditDialog";

// Logo - optional, mit Fallback
let logoImg = null;
try {
  logoImg = new URL("../../assets/trapmap-logo.png", import.meta.url).href;
} catch (e) {
  // Logo nicht vorhanden
}

/* ENV */
const API = import.meta.env.VITE_API_URL;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ============================================================
   MAPBOX TILE URLS
   ============================================================ */
const MAPBOX_STREETS = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_SAT = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;

/* ============================================================
   ICONS
   ============================================================ */
const createObjectIcon = () => {
  return L.divIcon({
    html: `<div style="background: #6366f1; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <div style="transform: rotate(45deg); color: white; font-size: 18px; font-weight: bold;">O</div>
    </div>`,
    className: "custom-object-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const getBoxDisplayNumber = (box) => {
  if (box.qr_code) {
    const match = box.qr_code.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10).toString();
  }
  return box.number || box.id;
};

/* ============================================================
   STATUS COLOR HELPER
   ============================================================ */
const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "green" || s === "ok") return "green";
  if (s === "yellow" || s.includes("gering")) return "yellow";
  if (s === "orange" || s.includes("auffällig")) return "orange";
  if (s === "red" || s.includes("befall")) return "red";
  return "gray";
};

/* ============================================================
   BOX ICON HELPER
   ============================================================ */
const getBoxIcon = (box) => {
  const typeName = (box.box_type_name || "").toLowerCase();
  if (typeName.includes("schlag") || typeName.includes("trap")) return "T";
  if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("rodent") || typeName.includes("nager") || typeName.includes("köder") || typeName.includes("ratte") || typeName.includes("maus")) return "R";
  if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("käfer")) return "I";
  if (typeName.includes("uv") || typeName.includes("licht")) return "L";
  return "B";
};

const createBoxIcon = (displayNumber, status = "green") => {
  const colors = {
    green: "#10b981",
    yellow: "#eab308",
    orange: "#fb923c",
    red: "#dc2626",
    gray: "#6b7280",
    blue: "#3b82f6",
  };
  const color = colors[status] || colors.green;

  return L.divIcon({
    html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">${displayNumber}</div>`,
    className: "custom-box-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

/* ============================================================
   BOX MARKER
   ============================================================ */
function BoxMarker({ box, onClick }) {
  const displayNum = getBoxDisplayNumber(box);
  return (
    <Marker
      position={[box.lat, box.lng]}
      icon={createBoxIcon(displayNum, box.current_status || box.status)}
      eventHandlers={{ click: () => onClick(box) }}
    />
  );
}

/* ============================================================
   OBJECT MARKER
   ============================================================ */
function ObjectMarkerComponent({ object, isSelected, onSelect }) {
  return (
    <Marker
      position={[object.lat, object.lng]}
      icon={createObjectIcon()}
      eventHandlers={{ click: () => onSelect(object) }}
    />
  );
}

/* ============================================================
   COLLAPSIBLE BOX SECTION (Aufklappbare Sektion)
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
   BOX LIST ITEM (Mit Details: Letzte Kontrolle, Techniker)
   ============================================================ */
function BoxListItem({ box, onClick, showLocation = false, isFloorplan = false }) {
  const formatLastScan = (lastScan) => {
    if (!lastScan) return "Nie kontrolliert";
    const date = new Date(lastScan);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const displayNum = getBoxDisplayNumber(box);
  const statusColor = getStatusColor(box.current_status || box.status);

  return (
    <div className={`box-item-detailed ${isFloorplan ? 'floorplan' : ''}`} onClick={onClick}>
      <div className="box-item-main">
        <div className={`box-number-badge ${statusColor}`}>
          {displayNum}
        </div>
        <div className="box-item-info">
          <div className="box-item-name">
            {box.box_type_name || 'Kein Typ'}
            {isFloorplan && <LayoutGrid size={12} className="floorplan-badge" />}
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

  const [searchParams, setSearchParams] = useSearchParams();
  const urlObjectId = searchParams.get("object_id");
  const urlFlyTo = searchParams.get("flyTo") === "true";
  const urlOpenBox = searchParams.get("openBox");
  const urlFirstSetup = searchParams.get("firstSetup") === "true";

  // Data
  const [objects, setObjects] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);
  const [poolBoxes, setPoolBoxes] = useState([]); // Lager-Boxen

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Lager-Anforderung State
  const [requestCount, setRequestCount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState(null);

  // Click-to-Place Modus (für Mobile/Tablet)
  const [boxToPlace, setBoxToPlace] = useState(null);
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || 'ontouchstart' in window);

  // Map
  const [mapStyle, setMapStyle] = useState("streets");
  const [styleOpen, setStyleOpen] = useState(false);

  // Placing
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [tempObjectLatLng, setTempObjectLatLng] = useState(null);
  const [repositionBox, setRepositionBox] = useState(null);

  // Search - Objekte
  const [objectSearchQuery, setObjectSearchQuery] = useState("");
  
  // Search - Adresse (Geocoding)
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressTimeoutRef = useRef(null);

  // Drag & Drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const mapRef = useRef(null);
  const mapWrapperRef = useRef(null);

  /* ============================================================
     LOAD DATA
     ============================================================ */
  const loadObjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/objects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const arr = Array.isArray(json) ? json : [];
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de"));
      setObjects(arr);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Objekte:", e);
    }
  }, [token]);

  const loadBoxes = useCallback(async (objectId) => {
    try {
      const res = await fetch(`${API}/boxes?object_id=${objectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      let boxesData = Array.isArray(json) ? json : json.data || [];
      setBoxes(boxesData);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Boxen:", e);
      setBoxes([]);
    }
  }, [token]);

  const loadBoxTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/boxtypes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      let types = Array.isArray(json) ? json : json.data || json.boxtypes || [];
      setBoxTypes(types);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Boxtypen:", e);
    }
  }, [token]);

  // Pool-Boxen laden (Lagerbestand)
  const loadPoolBoxes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/qr/codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const allCodes = Array.isArray(json) ? json : [];
      
      // Nur Codes ohne object_id (im Pool)
      const pool = allCodes
        .filter(qr => !qr.boxes?.object_id)
        .sort((a, b) => {
          // Nach sequence_number sortieren (kleinste zuerst)
          const numA = a.sequence_number ?? extractNumber(a);
          const numB = b.sequence_number ?? extractNumber(b);
          return numA - numB;
        });
      
      setPoolBoxes(pool);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Pool-Boxen:", e);
      setPoolBoxes([]);
    }
  }, [token]);

  // Nummer aus QR-Code extrahieren
  const extractNumber = (qr) => {
    if (qr.sequence_number != null) return qr.sequence_number;
    const match = qr.id?.match(/(\d+)$/);
    if (match) return parseInt(match[1], 10);
    return 999999;
  };

  useEffect(() => {
    loadObjects();
    loadBoxTypes();
    loadPoolBoxes();
  }, [loadObjects, loadBoxTypes, loadPoolBoxes]);

  // Flag um doppeltes Laden zu verhindern
  const [skipNextBoxLoad, setSkipNextBoxLoad] = useState(false);

  // URL Parameter handling (object_id, flyTo, openBox, firstSetup)
  useEffect(() => {
    if (urlObjectId && objects.length > 0) {
      const targetObject = objects.find(obj => String(obj.id) === urlObjectId);
      if (targetObject) {
        // Flag setzen um doppeltes Laden zu verhindern
        setSkipNextBoxLoad(true);
        setSelectedObject(targetObject);
        
        // Boxen laden und dann ggf. Dialog öffnen
        const loadAndOpenBox = async () => {
          try {
            const res = await fetch(`${API}/boxes?object_id=${targetObject.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            const boxesData = Array.isArray(json) ? json : json.data || [];
            setBoxes(boxesData);
            
            console.log("🔍 Loaded boxes:", boxesData.length, "Looking for:", urlOpenBox);
            
            // FlyTo wenn gewünscht
            if (urlFlyTo && targetObject.lat && targetObject.lng) {
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.flyTo([targetObject.lat, targetObject.lng], 18, { duration: 1.5 });
                }
              }, 500);
            }
            
            // openBox - Dialog öffnen
            if (urlOpenBox && boxesData.length > 0) {
              const targetBox = boxesData.find(box => String(box.id) === urlOpenBox);
              console.log("🔍 Found box:", targetBox?.id, targetBox?.qr_code, "firstSetup:", urlFirstSetup);
              if (targetBox) {
                // Kurz warten bis UI bereit
                setTimeout(() => {
                  setSelectedBox(targetBox);
                  
                  if (urlFirstSetup) {
                    // Ersteinrichtung → BoxEditDialog
                    setIsFirstSetup(true);
                    setBoxEditDialogOpen(true);
                    console.log("✅ Opening SETUP dialog for box:", targetBox.id);
                  } else {
                    // Normale Kontrolle → BoxScanDialog
                    setControlDialogOpen(true);
                    console.log("✅ Opening CONTROL dialog for box:", targetBox.id);
                  }
                }, 300);
              }
            }
            
            // URL-Parameter löschen
            setSearchParams({});
          } catch (e) {
            console.error("❌ Fehler beim Laden:", e);
          }
        };
        
        loadAndOpenBox();
      }
    }
  }, [urlObjectId, urlFlyTo, urlOpenBox, urlFirstSetup, objects, token, setSearchParams]);

  // openBox ohne object_id (falls Box direkt verlinkt)
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
      // Skip wenn wir gerade vom URL-Handler kommen
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
     BOXEN AUS LAGER ANFORDERN
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

    // Prüfen ob genug Boxen im Pool
    if (poolBoxes.length < count) {
      setRequestMessage({ 
        type: "error", 
        text: `Nicht genug Boxen! Verfügbar: ${poolBoxes.length}, Angefordert: ${count}` 
      });
      return;
    }

    // Die ersten X Pool-Boxen nehmen (kleinste Nummern zuerst)
    const boxesToAssign = poolBoxes.slice(0, count);
    
    setRequesting(true);
    setRequestMessage({ type: "info", text: `Weise ${count} Boxen zu...` });

    let successCount = 0;
    let errorCount = 0;

    for (const qr of boxesToAssign) {
      const boxId = qr.boxes?.id || qr.box_id;
      if (!boxId) {
        errorCount++;
        continue;
      }

      try {
        const res = await fetch(`${API}/boxes/${boxId}/assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ object_id: selectedObject.id })
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      setRequestMessage({ 
        type: "success", 
        text: `✓ ${successCount} Boxen zugewiesen` 
      });
    } else {
      setRequestMessage({ 
        type: "warning", 
        text: `${successCount} zugewiesen, ${errorCount} fehlgeschlagen` 
      });
    }

    setRequestCount("");
    loadBoxes(selectedObject.id);
    loadPoolBoxes(); // Pool aktualisieren
    setRequesting(false);

    // Nachricht nach 3 Sekunden ausblenden
    setTimeout(() => setRequestMessage(null), 3000);
  };

  /* ============================================================
     ADDRESS SEARCH (Mapbox Geocoding)
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
     SORTED & FILTERED DATA
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

  // Boxen sortiert: Kleinste Nummer zuerst, Maps vor Floorplan
  const sortedBoxes = useMemo(() => {
    if (!boxes.length) return { mapBoxes: [], floorplanBoxes: [], unplacedBoxes: [] };

    const getNumber = (box) => {
      if (box.qr_code) {
        const match = box.qr_code.match(/(\d+)$/);
        if (match) return parseInt(match[1], 10);
      }
      if (box.number) return parseInt(box.number, 10);
      return box.id || 9999;
    };

    const sortByNumber = (a, b) => getNumber(a) - getNumber(b);

    const mapBoxes = boxes
      .filter(b => (b.position_type === 'gps' || b.position_type === 'map') && b.lat && b.lng)
      .sort(sortByNumber);

    const floorplanBoxes = boxes
      .filter(b => b.position_type === 'floorplan')
      .sort(sortByNumber);

    const unplacedBoxes = boxes
      .filter(b => !b.position_type || b.position_type === 'none' || b.position_type === 'pool')
      .sort(sortByNumber);

    return { mapBoxes, floorplanBoxes, unplacedBoxes };
  }, [boxes]);

  /* ============================================================
     HANDLERS
     ============================================================ */
  const handleObjectClick = (obj) => {
    setSelectedObject(obj);
    setRequestMessage(null);
    setRequestCount("");
    if (obj.lat && obj.lng && mapRef.current) {
      mapRef.current.flyTo([obj.lat, obj.lng], 17, { duration: 1.0 });
    }
  };

  const handleBoxClick = (box) => {
    if (box.position_type === 'floorplan') {
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
      navigate(`/layouts/${selectedObject.id}`);
    }
    setFloorplanDialogOpen(false);
    setPendingFloorplanBox(null);
  };

  const handleBackToObjects = () => {
    setSelectedObject(null);
    setBoxes([]);
    setRequestMessage(null);
    setRequestCount("");
  };

  /* ============================================================
     DRAG & DROP
     ============================================================ */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
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
        // Box platzieren (Click-to-Place für Mobile)
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

  // Box auf Karte platzieren (Click-to-Place)
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
          <div className="header-logo">
            {logoImg && <img src={logoImg} alt="TrapMap" onError={(e) => { e.target.style.display = 'none'; }} />}
            <span className="logo-text">TrapMap</span>
          </div>
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
          {canEdit && (
            <button
              className={`header-btn ${objectPlacingMode ? 'active' : ''}`}
              onClick={() => setObjectPlacingMode(!objectPlacingMode)}
            >
              <Plus size={18} />
              <span>Objekt</span>
            </button>
          )}

          <div className="map-style-toggle">
            <button onClick={() => setStyleOpen(!styleOpen)}>
              <Layers3 size={18} />
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

          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
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
          <span>Klicke auf die Karte um Box #{getBoxDisplayNumber(repositionBox)} zu verschieben</span>
          <button onClick={() => setRepositionBox(null)}>
            <X size={16} /> Abbrechen
          </button>
        </div>
      )}

      {boxToPlace && (
        <div className="placing-hint" style={{ borderColor: "#10b981", color: "#10b981" }}>
          <MapPin size={18} />
          <span>Klicke auf die Karte um Box #{getBoxDisplayNumber(boxToPlace)} zu platzieren</span>
          <button onClick={() => setBoxToPlace(null)} style={{ background: "rgba(16, 185, 129, 0.15)" }}>
            <X size={16} /> Abbrechen
          </button>
        </div>
      )}

      {/* ============================================================
          MAIN CONTENT: Map + Sidebar
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
            maxZoom={22}
            zoomControl={false}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              key={`base-${mapStyle}`}
              url={getTileUrl()}
              attribution='&copy; Mapbox'
              tileSize={512}
              zoomOffset={-1}
              maxNativeZoom={20}
              maxZoom={22}
            />
            {mapStyle === "hybrid" && (
              <TileLayer key="hybrid-labels" url={MAPBOX_STREETS} tileSize={512} zoomOffset={-1} opacity={0.6} maxNativeZoom={20} maxZoom={22} />
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
              <BoxMarker key={box.id} box={box} onClick={handleBoxClick} />
            ))}
          </MapContainer>

          <div className="zoom-controls">
            <button onClick={() => mapRef.current?.zoomIn()}>+</button>
            <button onClick={() => mapRef.current?.zoomOut()}>−</button>
          </div>
        </div>

        {/* ============================================================
            SIDEBAR
            ============================================================ */}
        <aside className={`maps-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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

              <div className="sidebar-content">
                {/* ============================================
                    BOXEN AUS LAGER ANFORDERN
                    ============================================ */}
                <div style={{
                  background: "linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                  border: "1px solid #3b82f6"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <Package size={16} style={{ color: "#60a5fa" }} />
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Boxen aus Lager anfordern</span>
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Anzahl"
                      value={requestCount}
                      onChange={(e) => {
                        setRequestCount(e.target.value);
                        setRequestMessage(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleRequestBoxes()}
                      style={{
                        flex: "0 0 80px",
                        padding: "8px 10px",
                        background: "#0f172a",
                        border: "1px solid #374151",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 14,
                        textAlign: "center"
                      }}
                    />
                    <button
                      onClick={handleRequestBoxes}
                      disabled={requesting || !requestCount}
                      style={{
                        flex: 1,
                        padding: "8px 14px",
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
                  
                  {/* Verfügbare Boxen */}
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: 11, 
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>{poolBoxes.length}</span>
                    <span>Boxen im Lager verfügbar</span>
                  </div>

                  {/* Feedback Message */}
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

                {/* Statistik-Übersicht */}
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
                    <span className="stat-label">Lageplan</span>
                  </div>
                  <div className="stat-item warning">
                    <span className="stat-value">{sortedBoxes.unplacedBoxes.length}</span>
                    <span className="stat-label">Offen</span>
                  </div>
                </div>

                {/* Unplatzierte Boxen */}
                <CollapsibleBoxSection
                  title="Unplatzierte Boxen"
                  icon={<MapPin size={16} />}
                  count={sortedBoxes.unplacedBoxes.length}
                  variant="warning"
                  defaultOpen={sortedBoxes.unplacedBoxes.length > 0}
                >
                  {sortedBoxes.unplacedBoxes.length === 0 ? (
                    <div className="section-empty">Alle Boxen sind platziert ✓</div>
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
                          // Mobile/Tablet: Click-to-Place Modus
                          if (isMobile) {
                            setBoxToPlace(boxToPlace?.id === box.id ? null : box);
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
                          <h4>{getBoxDisplayNumber(box)}</h4>
                          <p>{box.box_type_name || 'Kein Typ'}</p>
                        </div>
                        <span className="drag-hint" style={{ color: boxToPlace?.id === box.id ? '#10b981' : undefined }}>
                          {isMobile 
                            ? (boxToPlace?.id === box.id ? '✓ Karte klicken' : '→ Antippen') 
                            : '⇢ Ziehen'}
                        </span>
                      </div>
                    ))
                  )}
                </CollapsibleBoxSection>

                {/* Karten-Boxen */}
                <CollapsibleBoxSection
                  title="Karten-Boxen"
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
                        showLocation={false}
                      />
                    ))
                  )}
                </CollapsibleBoxSection>

                {/* Lageplan-Boxen */}
                <CollapsibleBoxSection
                  title="Lageplan-Boxen"
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
                        showLocation={true}
                        isFloorplan={true}
                      />
                    ))
                  )}
                </CollapsibleBoxSection>

                {/* Keine Boxen */}
                {boxes.length === 0 && (
                  <div className="empty-state">
                    <MapPin size={32} />
                    <p>Keine Boxen vorhanden</p>
                    <small>Boxen oben anfordern oder per QR-Code scannen</small>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ============================================================
          DIALOGS
          ============================================================ */}

      {/* Floorplan Dialog */}
      {floorplanDialogOpen && (
        <div className="dialog-overlay" onClick={() => setFloorplanDialogOpen(false)}>
          <div className="dialog-compact" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-icon">
              <LayoutGrid size={32} />
            </div>
            <h3>Zum Lageplan wechseln?</h3>
            <p>Diese Box befindet sich auf dem Lageplan von <strong>{selectedObject?.name}</strong>.</p>
            <div className="dialog-buttons">
              <button className="btn-secondary" onClick={() => setFloorplanDialogOpen(false)}>
                Abbrechen
              </button>
              <button className="btn-primary" onClick={handleGoToFloorplan}>
                <LayoutGrid size={16} />
                Zum Lageplan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Dialog */}
      {controlDialogOpen && selectedBox && (
        <BoxScanDialog
          box={selectedBox}
          onClose={() => { setControlDialogOpen(false); setSelectedBox(null); }}
          onEdit={() => { setIsFirstSetup(false); setBoxEditDialogOpen(true); setControlDialogOpen(false); }}
          onSave={() => { setControlDialogOpen(false); setSelectedBox(null); if (selectedObject) loadBoxes(selectedObject.id); }}
          onAdjustPosition={(box) => { setControlDialogOpen(false); setRepositionBox(box); setSelectedBox(null); }}
          onSetGPS={(box) => {
            setControlDialogOpen(false);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    await fetch(`${API}/boxes/${box.id}/location`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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

      {/* Box Edit Dialog */}
      {boxEditDialogOpen && selectedBox && (
        <BoxEditDialog
          box={selectedBox}
          boxTypes={boxTypes}
          isFirstSetup={isFirstSetup}
          onClose={() => { setBoxEditDialogOpen(false); setSelectedBox(null); setIsFirstSetup(false); }}
          onSave={() => { setBoxEditDialogOpen(false); setSelectedBox(null); setIsFirstSetup(false); if (selectedObject) loadBoxes(selectedObject.id); }}
          onAdjustPosition={() => { setBoxEditDialogOpen(false); setRepositionBox(selectedBox); setIsFirstSetup(false); setSelectedBox(null); }}
          onSetGPS={() => {
            setBoxEditDialogOpen(false);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    await fetch(`${API}/boxes/${selectedBox.id}/location`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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

      {/* Object Create Dialog */}
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

      {/* Object Edit Dialog */}
      {objectEditDialogOpen && selectedObject && (
        <ObjectEditDialog
          object={selectedObject}
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