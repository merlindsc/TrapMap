/* ============================================================
   TRAPMAP - MAPS V6 PROFESSIONAL
   - Popup-frei
   - Sidebar automatisch
   - Box-Klick - Kontrolle
   - Objekt-Klick - Sidebar
   - Icons nach Typ
   - Kein Scrollen
   - 48px Header
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { Plus, Layers3, X, Search } from "lucide-react";
import "./Maps.css";

// Components
import ObjectSidebar from "./ObjectSidebar";
import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "./BoxEditDialog";
import ObjectCreateDialog from "./ObjectCreateDialog";
import ObjectEditDialog from "./ObjectEditDialog";
import BoxCreateDialog from "./BoxCreateDialog";

/* ENV */
const API = import.meta.env.VITE_API_URL;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ============================================================
   MAPBOX TILE URLS
   ============================================================ */

const MAPBOX_STREETS = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_SAT = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;

/* ============================================================
   ICONS - Different per Box Type with Animal Symbols
   Alle Box-Typen mit eindeutigen Icons
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

// SVG Icons - ALLE TYPEN
const BOX_TYPE_ICONS = {
  // Emojis statt SVG - klar erkennbar!
  rat: '🐀',
  mouse: '🐁',
  snapTrap: '⚠️',
  tunnel: '🔶',
  bait: '🟢',
  liveTrap: '🔵',
  monitoring: '👁️',
  moth: '🦋',
  cockroach: '🪳',
  beetle: '🪲',
  insect: '🪰',
  uvLight: '☀️',
};

// Bestimme Icons basierend auf box_type Name - ERWEITERT
const getBoxTypeIconConfig = (boxTypeName) => {
  if (!boxTypeName) return null;
  
  const name = boxTypeName.toLowerCase();
  
  // === SCHLAGFALLEN ===
  // Schlagfallen-Tunnel Ratte
  if ((name.includes('schlagfall') || name.includes('snap')) && name.includes('tunnel') && (name.includes('ratte') || name.includes('rat'))) {
    return { icons: ['rat', 'tunnel'], color: '#f97316' };
  }
  // Schlagfallen-Tunnel Maus
  if ((name.includes('schlagfall') || name.includes('snap')) && name.includes('tunnel') && (name.includes('maus') || name.includes('mouse'))) {
    return { icons: ['mouse', 'tunnel'], color: '#f97316' };
  }
  // Schlagfalle Ratte (normal)
  if ((name.includes('schlagfall') || name.includes('snap')) && (name.includes('ratte') || name.includes('rat'))) {
    return { icons: ['rat', 'snapTrap'], color: '#ef4444' };
  }
  // Schlagfalle Maus (normal)
  if ((name.includes('schlagfall') || name.includes('snap')) && (name.includes('maus') || name.includes('mouse'))) {
    return { icons: ['mouse', 'snapTrap'], color: '#ef4444' };
  }
  
  // === KOEDERSTATIONEN ===
  if ((name.includes('koeder') || name.includes('koeder') || name.includes('bait')) && (name.includes('ratte') || name.includes('rat'))) {
    return { icons: ['rat', 'bait'], color: '#22c55e' };
  }
  if ((name.includes('koeder') || name.includes('koeder') || name.includes('bait')) && (name.includes('maus') || name.includes('mouse'))) {
    return { icons: ['mouse', 'bait'], color: '#22c55e' };
  }
  
  // === LEBENDFALLEN ===
  if ((name.includes('lebend') || name.includes('live')) && (name.includes('ratte') || name.includes('rat'))) {
    return { icons: ['rat', 'liveTrap'], color: '#3b82f6' };
  }
  if ((name.includes('lebend') || name.includes('live')) && (name.includes('maus') || name.includes('mouse'))) {
    return { icons: ['mouse', 'liveTrap'], color: '#3b82f6' };
  }
  
  // === MONITORING ===
  if (name.includes('monitoring') && (name.includes('ratte') || name.includes('rat'))) {
    return { icons: ['rat', 'monitoring'], color: '#8b5cf6' };
  }
  if (name.includes('monitoring') && (name.includes('maus') || name.includes('mouse'))) {
    return { icons: ['mouse', 'monitoring'], color: '#8b5cf6' };
  }
  
  // === SPEZIAL-MONITORE ===
  if (name.includes('motten')) {
    return { icons: ['moth'], color: '#d97706' };
  }
  if (name.includes('schaben')) {
    return { icons: ['cockroach'], color: '#78716c' };
  }
  if (name.includes('kaefer') || name.includes('kaefer')) {
    return { icons: ['beetle'], color: '#92400e' };
  }
  if (name.includes('insekt') || name.includes('insect')) {
    return { icons: ['insect'], color: '#65a30d' };
  }
  if (name.includes('uv') || name.includes('licht') || name.includes('light')) {
    return { icons: ['uvLight'], color: '#a855f7' };
  }
  
  // === FALLBACK: Nur Tier ===
  if (name.includes('ratte') || name.includes('rat')) {
    return { icons: ['rat'], color: '#6b7280' };
  }
  if (name.includes('maus') || name.includes('mouse')) {
    return { icons: ['mouse'], color: '#6b7280' };
  }
  
  return null;
};

const createBoxIcon = (boxNumber, status = "green", boxTypeName = null) => {
  const colors = {
    green: "#10b981",
    yellow: "#eab308",
    orange: "#fb923c",
    red: "#dc2626",
    gray: "#6b7280",
    blue: "#3b82f6",
  };

  const color = colors[status] || colors.green;
  const displayNum = String(boxNumber || "?").slice(-3);
  
  // Hole Icon-Config
  const iconConfig = getBoxTypeIconConfig(boxTypeName);
  
  if (iconConfig && iconConfig.icons && iconConfig.icons.length > 0) {
    // Erzeuge Emoji Icons
    const emojis = iconConfig.icons.map(iconKey => BOX_TYPE_ICONS[iconKey] || '').join('');
    const iconWidth = iconConfig.icons.length > 1 ? 52 : 40;
    
    const iconHtml = `
      <div style="position: relative; width: ${iconWidth}px; height: 56px;">
        <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: flex; gap: 1px; background: rgba(0,0,0,0.85); border-radius: 8px; padding: 3px 6px; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
          <span style="font-size: 16px; line-height: 1;">${emojis}</span>
        </div>
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">${displayNum}</div>
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: "custom-box-marker",
      iconSize: [iconWidth, 54],
      iconAnchor: [iconWidth / 2, 54],
    });
  }
  
  // Standard: Nur Nummer
  return L.divIcon({
    html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">${displayNum}</div>`,
    className: "custom-box-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

/* ============================================================
   BOX MARKER - NO POPUP, only onClick
   ============================================================ */
function BoxMarker({ box, onClick }) {
  // Guard: keine ungueltigen Koordinaten
  if (!box?.lat || !box?.lng) return null;
  
  // box_type_name kann von verschiedenen Stellen kommen
  const boxTypeName = box.box_type_name || box.box_type?.name || box.type_name || null;
  
  return (
    <Marker
      position={[box.lat, box.lng]}
      icon={createBoxIcon(box.number || box.id, box.current_status || box.status, boxTypeName)}
      eventHandlers={{
        click: () => onClick(box),
      }}
    />
  );
}

/* ============================================================
   OBJECT MARKER - NO POPUP, only onClick
   ============================================================ */
function ObjectMarkerComponent({ object, isSelected, onSelect }) {
  // Guard: keine ungueltigen Koordinaten
  if (!object?.lat || !object?.lng) return null;
  
  return (
    <Marker
      position={[object.lat, object.lng]}
      icon={createObjectIcon()}
      eventHandlers={{
        click: () => onSelect(object),
      }}
    />
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function Maps() {
  const token = localStorage.getItem("trapmap_token");
  const userStr = localStorage.getItem("trapmap_user");
  const user = userStr ? JSON.parse(userStr) : null;
  const canEdit = user?.role === "admin" || user?.role === "editor";

  // URL Parameters for deep linking
  const [searchParams, setSearchParams] = useSearchParams();
  const urlObjectId = searchParams.get("object_id");
  const urlFlyTo = searchParams.get("flyTo") === "true";

  // Data
  const [objects, setObjects] = useState([]);
  const [filteredObjects, setFilteredObjects] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);

  // Selected items
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [boxEditDialogOpen, setBoxEditDialogOpen] = useState(false);
  const [objectCreateDialogOpen, setObjectCreateDialogOpen] = useState(false);
  const [objectEditDialogOpen, setObjectEditDialogOpen] = useState(false);
  const [boxCreateDialogOpen, setBoxCreateDialogOpen] = useState(false);

  // Map
  const [mapStyle, setMapStyle] = useState("streets");
  const [styleOpen, setStyleOpen] = useState(false);

  // Placing modes
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [boxPlacingMode, setBoxPlacingMode] = useState(false);
  const [tempObjectLatLng, setTempObjectLatLng] = useState(null);
  const [tempBoxLatLng, setTempBoxLatLng] = useState(null);

  // Search
  const [objectSearchQuery, setObjectSearchQuery] = useState("");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);

  const mapRef = useRef(null);

  /* ============================================================
     ESC KEY HANDLER
     ============================================================ */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (controlDialogOpen) {
          setControlDialogOpen(false);
          setSelectedBox(null);
        } else if (boxEditDialogOpen) {
          setBoxEditDialogOpen(false);
        } else if (objectEditDialogOpen) {
          setObjectEditDialogOpen(false);
        } else if (objectCreateDialogOpen) {
          setObjectCreateDialogOpen(false);
          setTempObjectLatLng(null);
          setObjectPlacingMode(false);
        } else if (boxCreateDialogOpen) {
          setBoxCreateDialogOpen(false);
          setTempBoxLatLng(null);
          setBoxPlacingMode(false);
        } else if (sidebarOpen) {
          setSidebarOpen(false);
          setSelectedObject(null);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [controlDialogOpen, boxEditDialogOpen, objectEditDialogOpen, objectCreateDialogOpen, boxCreateDialogOpen, sidebarOpen]);

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

      console.log("B Loaded objects:", arr.length);
      setObjects(arr);
      setFilteredObjects(arr);
    } catch (e) {
      console.error("- Fehler beim Laden der Objekte:", e);
    }
  }, [token]);

  const loadBoxes = useCallback(
    async (objectId) => {
      try {
        console.log("B Fetching boxes for object:", objectId);

        const res = await fetch(`${API}/boxes?object_id=${objectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();

        let boxesData = [];
        if (Array.isArray(json)) {
          boxesData = json;
        } else if (Array.isArray(json.data)) {
          boxesData = json.data;
        }

        console.log("B Loaded boxes:", boxesData.length);
        setBoxes(boxesData);
      } catch (e) {
        console.error("- Fehler beim Laden der Boxen:", e);
        setBoxes([]);
      }
    },
    [token]
  );

  const loadBoxTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/boxtypes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      let types = [];
      if (Array.isArray(json)) types = json;
      else if (Array.isArray(json.data)) types = json.data;
      else if (Array.isArray(json.boxtypes)) types = json.boxtypes;

      console.log("B Loaded box types:", types.length);
      setBoxTypes(types);
    } catch (e) {
      console.error("- Fehler beim Laden der Boxtypen:", e);
    }
  }, [token]);

  useEffect(() => {
    loadObjects();
    loadBoxTypes();
  }, [loadObjects, loadBoxTypes]);

  // Handle URL parameter for deep linking (flyTo object)
  useEffect(() => {
    if (urlObjectId && objects.length > 0 && urlFlyTo) {
      const targetObject = objects.find(obj => String(obj.id) === urlObjectId);
      if (targetObject && targetObject.lat && targetObject.lng) {
        console.log("[FLYTO] Flying to object from URL:", targetObject.name);
        setSelectedObject(targetObject);
        loadBoxes(targetObject.id);
        setSidebarOpen(true);
        
        // Give map time to initialize then fly
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.flyTo([targetObject.lat, targetObject.lng], 18, {
              duration: 1.5,
            });
          }
        }, 500);
        
        // Clear URL params after handling
        setSearchParams({});
      }
    }
  }, [urlObjectId, urlFlyTo, objects, loadBoxes, setSearchParams]);

  useEffect(() => {
    if (selectedObject) {
      console.log("B Loading boxes for object:", selectedObject.id);
      loadBoxes(selectedObject.id);
      setSidebarOpen(true); // - Sidebar oeffnet automatisch
    } else {
      setBoxes([]);
      setSidebarOpen(false);
    }
  }, [selectedObject, loadBoxes]);

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleBoxClick = (box) => {
    console.log("B Box clicked:", box);
    setSelectedBox(box);
    setControlDialogOpen(true); // - Kontrolle oeffnet, NICHT Bearbeiten!
  };

  const handleObjectClick = (obj) => {
    console.log("[OBJ] Object clicked:", obj);
    setSelectedObject(obj);
    loadBoxes(obj.id);
    setSidebarOpen(true);
    
    // Nur flyTo wenn Koordinaten gueltig sind
    if (mapRef.current && obj.lat && obj.lng) {
      mapRef.current.flyTo([obj.lat, obj.lng], 18, {
        duration: 1.0,
      });
    }
  };

  /* ============================================================
     ADDRESS SEARCH (Nominatim)
     ============================================================ */

  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setAddressResults([]);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setAddressResults(data);
    } catch (e) {
      console.error("- Address search error:", e);
    }
  };

  const selectAddress = (result) => {
    // Nur flyTo wenn Koordinaten gueltig sind
    if (mapRef.current && result?.lat && result?.lon) {
      mapRef.current.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 16, {
        duration: 1.0,
      });
    }
    setAddressResults([]);
    setAddressSearchQuery("");
  };

  /* ============================================================
     OBJECT SEARCH
     ============================================================ */

  const filterObjects = (query) => {
    setObjectSearchQuery(query);
    if (!query.trim()) {
      setFilteredObjects(objects);
      return;
    }

    const v = query.toLowerCase();
    setFilteredObjects(
      objects.filter(
        (o) =>
          o.name?.toLowerCase().includes(v) ||
          o.address?.toLowerCase().includes(v) ||
          o.city?.toLowerCase().includes(v)
      )
    );
  };

  /* ============================================================
     MAP HANDLERS
     ============================================================ */

  function MapReadyHandler() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  function MapEventsHandler() {
    useMapEvents({
      click(e) {
        if (objectPlacingMode) {
          setTempObjectLatLng(e.latlng);
          setObjectCreateDialogOpen(true);
          return;
        }

        if (boxPlacingMode && selectedObject) {
          setTempBoxLatLng(e.latlng);
          setBoxCreateDialogOpen(true);
          return;
        }
      },
    });

    return null;
  }

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
          HEADER (48px kompakt)
          ============================================================ */}
      <div className="maps-header-v6">
        {/* Objekt-Suche */}
        <div className="search-group">
          <Search size={18} className="search-icon" />
          <input
            className="object-search-input-v6"
            placeholder="Objekte suchen..."
            value={objectSearchQuery}
            onChange={(e) => filterObjects(e.target.value)}
          />
          {filteredObjects.length > 0 && objectSearchQuery && (
            <div className="object-dropdown">
              {filteredObjects.map((obj) => (
                <div
                  key={obj.id}
                  className="object-dropdown-item"
                  onClick={() => {
                    handleObjectClick(obj);
                    setObjectSearchQuery("");
                  }}
                >
                  <span className="object-name">{obj.name}</span>
                  <span className="object-address">{obj.address}, {obj.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adress-Suche (Nominatim) */}
        <div className="search-group">
          <Search size={18} className="search-icon" />
          <input
            className="address-search-input-v6"
            placeholder="Adresse suchen..."
            value={addressSearchQuery}
            onChange={(e) => {
              setAddressSearchQuery(e.target.value);
              searchAddress(e.target.value);
            }}
          />
          {addressResults.length > 0 && (
            <div className="address-dropdown">
              {addressResults.map((result, idx) => (
                <div
                  key={idx}
                  className="address-dropdown-item"
                  onClick={() => selectAddress(result)}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        {canEdit && (
          <button
            className={`action-btn-v6 ${objectPlacingMode ? "active" : ""}`}
            onClick={() => {
              setObjectPlacingMode(!objectPlacingMode);
              setBoxPlacingMode(false);
            }}
          >
            <Plus size={16} /> Objekt
          </button>
        )}

        {selectedObject && canEdit && (
          <button
            className={`action-btn-v6 ${boxPlacingMode ? "active" : ""}`}
            onClick={() => {
              setBoxPlacingMode(!boxPlacingMode);
              setObjectPlacingMode(false);
            }}
          >
            <Plus size={16} /> Box
          </button>
        )}

        {/* Map Style */}
        <div className="map-controls-v6">
          <button
            className="style-btn-v6"
            onClick={() => setStyleOpen(!styleOpen)}
          >
            <Layers3 size={18} />
          </button>

          {styleOpen && (
            <div className="style-dropdown-v6">
              <button
                className={mapStyle === "streets" ? "active" : ""}
                onClick={() => {
                  setMapStyle("streets");
                  setStyleOpen(false);
                }}
              >
                Strassen
              </button>

              <button
                className={mapStyle === "satellite" ? "active" : ""}
                onClick={() => {
                  setMapStyle("satellite");
                  setStyleOpen(false);
                }}
              >
                Satellit
              </button>

              <button
                className={mapStyle === "hybrid" ? "active" : ""}
                onClick={() => {
                  setMapStyle("hybrid");
                  setStyleOpen(false);
                }}
              >
                Hybrid
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          MAP
          ============================================================ */}
      <div className="map-wrapper-v6">
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
            attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
            tileSize={512}
            zoomOffset={-1}
            maxNativeZoom={20}
            maxZoom={22}
          />

          {mapStyle === "hybrid" && (
            <TileLayer
              key="hybrid-labels"
              url={MAPBOX_STREETS}
              tileSize={512}
              zoomOffset={-1}
              opacity={0.6}
              maxNativeZoom={20}
              maxZoom={22}
            />
          )}

          <MapReadyHandler />
          <MapEventsHandler />

          {/* Objects - nur mit gueltigen Koordinaten */}
          {objects.filter(obj => obj.lat && obj.lng).map((obj) => (
            <ObjectMarkerComponent
              key={obj.id}
              object={obj}
              isSelected={selectedObject?.id === obj.id}
              onSelect={handleObjectClick}
            />
          ))}

          {/* Boxes - NO POPUP! */}
          {boxes.filter(box => box.lat && box.lng).map((box) => (
            <BoxMarker
              key={box.id}
              box={box}
              onClick={handleBoxClick}
            />
          ))}
        </MapContainer>

        {/* Zoom Buttons - mittig rechts */}
        <div className="zoom-buttons-v6">
          <button onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button onClick={() => mapRef.current?.zoomOut()}>-</button>
        </div>
      </div>

      {/* ============================================================
          SIDEBAR (350px, slide-in)
          ============================================================ */}
      {sidebarOpen && selectedObject && (
        <ObjectSidebar
          object={selectedObject}
          boxes={boxes}
          onClose={() => {
            setSidebarOpen(false);
            setSelectedObject(null);
          }}
          onBoxClick={handleBoxClick}
          onEditObject={() => {
            setObjectEditDialogOpen(true);
          }}
          onCreateBox={() => {
            setBoxPlacingMode(true);
          }}
        />
      )}

      {/* ============================================================
          CONTROL DIALOG
          ============================================================ */}
      {controlDialogOpen && selectedBox && (
        <BoxScanDialog
          box={selectedBox}
          onClose={() => {
            setControlDialogOpen(false);
            setSelectedBox(null);
          }}
          onEdit={() => {
            setControlDialogOpen(false);
            setBoxEditDialogOpen(true);
          }}
          onSave={() => {
            setControlDialogOpen(false);
            setSelectedBox(null);
            // Reload boxes
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
        />
      )}

      {/* ============================================================
          BOX EDIT DIALOG
          ============================================================ */}
      {boxEditDialogOpen && selectedBox && (
        <BoxEditDialog
          box={selectedBox}
          boxTypes={boxTypes}
          onClose={() => {
            setBoxEditDialogOpen(false);
            setSelectedBox(null);
          }}
          onSave={() => {
            setBoxEditDialogOpen(false);
            setSelectedBox(null);
            // Reload boxes
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
          onDelete={() => {
            setBoxEditDialogOpen(false);
            setSelectedBox(null);
            // Reload boxes
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
        />
      )}

      {/* ============================================================
          OBJECT CREATE DIALOG
          ============================================================ */}
      {objectCreateDialogOpen && tempObjectLatLng && (
        <ObjectCreateDialog
          latLng={tempObjectLatLng}
          onClose={() => {
            setObjectCreateDialogOpen(false);
            setTempObjectLatLng(null);
            setObjectPlacingMode(false);
          }}
          onSave={(newObject) => {
            setObjects((prev) => [...prev, newObject]);
            setFilteredObjects((prev) => [...prev, newObject]);
            setSelectedObject(newObject);
            setObjectCreateDialogOpen(false);
            setTempObjectLatLng(null);
            setObjectPlacingMode(false);
          }}
        />
      )}

      {/* ============================================================
          OBJECT EDIT DIALOG
          ============================================================ */}
      {objectEditDialogOpen && selectedObject && (
        <ObjectEditDialog
          object={selectedObject}
          onClose={() => {
            setObjectEditDialogOpen(false);
          }}
          onSave={(updated) => {
            // Update in list
            setObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setFilteredObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelectedObject(updated);
            setObjectEditDialogOpen(false);
          }}
          onDelete={(id) => {
            // Remove from lists
            setObjects((prev) => prev.filter((o) => o.id !== id));
            setFilteredObjects((prev) => prev.filter((o) => o.id !== id));
            setSelectedObject(null);
            setSidebarOpen(false);
            setObjectEditDialogOpen(false);
          }}
        />
      )}

      {/* ============================================================
          BOX CREATE DIALOG
          ============================================================ */}
      {boxCreateDialogOpen && tempBoxLatLng && selectedObject && (
        <BoxCreateDialog
          latLng={tempBoxLatLng}
          objectId={selectedObject.id}
          boxTypes={boxTypes}
          onClose={() => {
            setBoxCreateDialogOpen(false);
            setTempBoxLatLng(null);
            setBoxPlacingMode(false);
          }}
          onSave={() => {
            setBoxCreateDialogOpen(false);
            setTempBoxLatLng(null);
            setBoxPlacingMode(false);
            // Reload boxes
            loadBoxes(selectedObject.id);
          }}
        />
      )}
    </div>
  );
}