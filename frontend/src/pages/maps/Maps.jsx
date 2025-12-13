/* ============================================================
   TRAPMAP - MAPS V9 PROFESSIONAL
   - TrapMap Logo im Header
   - Adresssuche mit Mapbox Geocoding
   - Rechte Sidebar: Objekte (A-Z) → Bei Auswahl: Boxen
   - Boxen: Kleinste Nummer zuerst, Maps vor Floorplan
   - Mobil-optimiert für App
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
  ChevronDown, Clock, User
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
  // Zeit seit letztem Scan formatieren
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

  // Data
  const [objects, setObjects] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);

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

  // Map
  const [mapStyle, setMapStyle] = useState("streets");
  const [styleOpen, setStyleOpen] = useState(false);

  // Placing
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [tempObjectLatLng, setTempObjectLatLng] = useState(null);
  const [repositionBox, setRepositionBox] = useState(null);
  const [placingBox, setPlacingBox] = useState(null); // NEU: Box die platziert werden soll (Touch-freundlich)

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
      // Alphabetisch sortieren
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

  useEffect(() => {
    loadObjects();
    loadBoxTypes();
  }, [loadObjects, loadBoxTypes]);

  // URL Parameter handling
  useEffect(() => {
    if (urlObjectId && objects.length > 0 && urlFlyTo) {
      const targetObject = objects.find(obj => String(obj.id) === urlObjectId);
      if (targetObject && targetObject.lat && targetObject.lng) {
        setSelectedObject(targetObject);
        loadBoxes(targetObject.id);
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.flyTo([targetObject.lat, targetObject.lng], 18, { duration: 1.5 });
          }
        }, 500);
        setSearchParams({});
      }
    }
  }, [urlObjectId, urlFlyTo, objects, loadBoxes, setSearchParams]);

  useEffect(() => {
    if (selectedObject) {
      loadBoxes(selectedObject.id);
    } else {
      setBoxes([]);
    }
  }, [selectedObject, loadBoxes]);

  /* ============================================================
     ADDRESS SEARCH (Mapbox Geocoding)
     ============================================================ */
  const handleAddressSearch = useCallback((query) => {
    // Clear previous timeout
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }

    if (!query || query.length < 3) {
      setAddressResults([]);
      return;
    }

    // Debounce: Wait 300ms before searching
    addressTimeoutRef.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        // Mapbox Geocoding API
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=de&country=de,at,ch&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.features) {
          setAddressResults(data.features.map(f => ({
            place_name: f.place_name,
            center: f.center, // [lng, lat]
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

    // Nummer aus QR-Code oder Box extrahieren
    const getNumber = (box) => {
      if (box.qr_code) {
        const match = box.qr_code.match(/(\d+)$/);
        if (match) return parseInt(match[1], 10);
      }
      if (box.number) return parseInt(box.number, 10);
      return box.id || 9999;
    };

    // Sortierung: kleinste Nummer zuerst (aufsteigend)
    const sortByNumber = (a, b) => getNumber(a) - getNumber(b);

    // GPS/Map Boxen (position_type kann 'gps' oder 'map' sein)
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
    if (obj.lat && obj.lng && mapRef.current) {
      mapRef.current.flyTo([obj.lat, obj.lng], 17, { duration: 1.0 });
    }
  };

  const handleBoxClick = (box) => {
    // Floorplan-Box? → Dialog zeigen
    if (box.position_type === 'floorplan') {
      setPendingFloorplanBox(box);
      setFloorplanDialogOpen(true);
      return;
    }

    // Normale Map-Box
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
        // Unplatzierte Box platzieren (Touch-freundlich)
        if (placingBox) {
          handlePlaceBox(e.latlng);
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

  // NEU: Unplatzierte Box auf Karte platzieren
  const handlePlaceBox = async (latlng) => {
    if (!placingBox || !selectedObject) return;
    try {
      const res = await fetch(`${API}/boxes/${placingBox.id}/place-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          lat: latlng.lat, 
          lng: latlng.lng,
          object_id: selectedObject.id
        })
      });
      if (res.ok) {
        await loadBoxes(selectedObject.id);
        console.log(`✅ Box ${placingBox.id} platziert bei ${latlng.lat}, ${latlng.lng}`);
      }
    } catch (err) {
      console.error("Place box error:", err);
    }
    setPlacingBox(null);
  };

  // Box zum Platzieren auswählen (Touch-freundlich)
  const handleSelectBoxForPlacing = (box) => {
    if (placingBox?.id === box.id) {
      // Gleiche Box nochmal geklickt -> Abbrechen
      setPlacingBox(null);
    } else {
      setPlacingBox(box);
      // Sidebar auf Mobile schließen damit Karte sichtbar ist
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
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
          HEADER - Adresssuche + Actions
          ============================================================ */}
      <header className="maps-header-modern">
        <div className="header-left">
          <div className="header-logo">
            {logoImg && <img src={logoImg} alt="TrapMap" onError={(e) => { e.target.style.display = 'none'; }} />}
            <span className="logo-text">TrapMap</span>
          </div>
        </div>

        <div className="header-center">
          {/* Adresssuche */}
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
            {/* Adress-Dropdown */}
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

          {/* Mobile: Sidebar Toggle */}
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

      {/* NEU: Hinweis für Touch-Platzierung */}
      {placingBox && (
        <div className="placing-hint placing-box">
          <MapPin size={18} />
          <span>Tippe auf die Karte um Box #{getBoxDisplayNumber(placingBox)} zu platzieren</span>
          <button onClick={() => setPlacingBox(null)}>
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

            {/* Objects */}
            {objects.filter(obj => obj.lat && obj.lng).map((obj) => (
              <ObjectMarkerComponent
                key={obj.id}
                object={obj}
                isSelected={selectedObject?.id === obj.id}
                onSelect={handleObjectClick}
              />
            ))}

            {/* Boxes - nur Map-Boxen anzeigen */}
            {sortedBoxes.mapBoxes.map((box) => (
              <BoxMarker key={box.id} box={box} onClick={handleBoxClick} />
            ))}
          </MapContainer>

          {/* Zoom Buttons */}
          <div className="zoom-controls">
            <button onClick={() => mapRef.current?.zoomIn()}>+</button>
            <button onClick={() => mapRef.current?.zoomOut()}>−</button>
          </div>
        </div>

        {/* ============================================================
            SIDEBAR - Objekte oder Boxen
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

              {/* Objekt-Suche */}
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
                {sortedBoxes.unplacedBoxes.length > 0 && (
                  <div className="box-section">
                    <div className="section-header warning">
                      <MapPin size={16} />
                      <span>Unplatziert</span>
                      <span className="count">{sortedBoxes.unplacedBoxes.length}</span>
                    </div>
                    <div className="box-list">
                      {sortedBoxes.unplacedBoxes.map((box) => (
                        <div
                          key={box.id}
                          className={`box-item unplaced ${placingBox?.id === box.id ? 'placing' : ''}`}
                          onClick={() => handleSelectBoxForPlacing(box)}
                        >
                          <span className="box-icon">{getBoxIcon(box)}</span>
                          <div className="box-info">
                            <h4>{getBoxDisplayNumber(box)}</h4>
                            <p>{box.box_type_name || 'Kein Typ'}</p>
                          </div>
                          <button 
                            className={`place-btn ${placingBox?.id === box.id ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectBoxForPlacing(box);
                            }}
                          >
                            {placingBox?.id === box.id ? '✕ Abbrechen' : '📍 Platzieren'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Karten-Boxen */}
                {sortedBoxes.mapBoxes.length > 0 && (
                  <div className="box-section">
                    <div className="section-header">
                      <Map size={16} />
                      <span>Karten-Boxen</span>
                      <span className="count">{sortedBoxes.mapBoxes.length}</span>
                    </div>
                    <div className="box-list">
                      {sortedBoxes.mapBoxes.map((box) => (
                        <div key={box.id} className="box-item" onClick={() => handleBoxClick(box)}>
                          <span className="box-icon">{getBoxIcon(box)}</span>
                          <div className="box-info">
                            <h4>{getBoxDisplayNumber(box)}</h4>
                            <p>{box.box_type_name || 'Kein Typ'}</p>
                            <small className="box-meta">
                              {box.last_scan ? `Letzte Kontrolle: ${new Date(box.last_scan).toLocaleDateString('de-DE')}` : 'Nie kontrolliert'}
                              {box.last_scan_by && ` • ${box.last_scan_by}`}
                            </small>
                          </div>
                          <span className={`status-dot ${getStatusColor(box.current_status || box.status)}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lageplan-Boxen */}
                {sortedBoxes.floorplanBoxes.length > 0 && (
                  <div className="box-section">
                    <div className="section-header floorplan">
                      <LayoutGrid size={16} />
                      <span>Lageplan-Boxen</span>
                      <span className="count">{sortedBoxes.floorplanBoxes.length}</span>
                    </div>
                    <div className="box-list">
                      {sortedBoxes.floorplanBoxes.map((box) => (
                        <div key={box.id} className="box-item floorplan" onClick={() => handleBoxClick(box)}>
                          <span className="box-icon">{getBoxIcon(box)}</span>
                          <div className="box-info">
                            <h4>{getBoxDisplayNumber(box)}</h4>
                            <p>{box.box_type_name || 'Kein Typ'}</p>
                            <small className="box-meta">
                              {box.last_scan ? `Letzte Kontrolle: ${new Date(box.last_scan).toLocaleDateString('de-DE')}` : 'Nie kontrolliert'}
                              {box.last_scan_by && ` • ${box.last_scan_by}`}
                            </small>
                          </div>
                          <LayoutGrid size={14} className="floorplan-icon" />
                          <span className={`status-dot ${getStatusColor(box.current_status || box.status)}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keine Boxen */}
                {boxes.length === 0 && (
                  <div className="empty-state">
                    <MapPin size={32} />
                    <p>Keine Boxen vorhanden</p>
                    <small>Boxen per QR-Code scannen oder im Box-Pool zuweisen</small>
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