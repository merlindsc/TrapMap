/* ============================================================
   TRAPMAP - MAPS V6 PROFESSIONAL
   - Popup-frei
   - Sidebar automatisch
   - Box-Klick - Kontrolle
   - Objekt-Klick - Sidebar
   - Icons nach Typ
   - Kein Scrollen
   - 48px Header
   - DRAG & DROP für unplatzierte Boxen
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

import { Plus, Layers3, X, Search, MapPin } from "lucide-react";
import "./Maps.css";

// Components
import ObjectSidebar from "./ObjectSidebar";
import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "./BoxEditDialog";
import ObjectCreateDialog from "./ObjectCreateDialog";
import ObjectEditDialog from "./ObjectEditDialog";

/* ENV */
const API = import.meta.env.VITE_API_URL;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ============================================================
   MAPBOX TILE URLS
   ============================================================ */

const MAPBOX_STREETS = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_SAT = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`;

/* ============================================================
   ICONS - Different per Box Type
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

// Box-Nummer aus QR-Code extrahieren (DSE-0096 → 96, DSE-0145 → 145)
const getBoxDisplayNumber = (box) => {
  if (box.qr_code) {
    // Letzte Ziffern extrahieren und führende Nullen entfernen
    const match = box.qr_code.match(/(\d+)$/);
    if (match) {
      return parseInt(match[1], 10).toString(); // "0096" → "96"
    }
  }
  // Fallback auf box.number oder ID
  return box.number || box.id;
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
   BOX MARKER - NO POPUP, only onClick
   ============================================================ */
function BoxMarker({ box, onClick }) {
  const displayNum = getBoxDisplayNumber(box);
  return (
    <Marker
      position={[box.lat, box.lng]}
      icon={createBoxIcon(displayNum, box.current_status || box.status)}
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
  const [isFirstSetup, setIsFirstSetup] = useState(false);  // Ersteinrichtung?
  const [objectCreateDialogOpen, setObjectCreateDialogOpen] = useState(false);
  const [objectEditDialogOpen, setObjectEditDialogOpen] = useState(false);

  // Map
  const [mapStyle, setMapStyle] = useState("streets");
  const [styleOpen, setStyleOpen] = useState(false);

  // Placing modes - NUR noch für Objekte
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [tempObjectLatLng, setTempObjectLatLng] = useState(null);
  
  // Box Position verschieben Modus
  const [repositionBox, setRepositionBox] = useState(null);  // Box die verschoben werden soll

  // Search
  const [objectSearchQuery, setObjectSearchQuery] = useState("");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);

  // Drag & Drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const mapRef = useRef(null);
  const mapWrapperRef = useRef(null);

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
        } else if (sidebarOpen) {
          setSidebarOpen(false);
          setSelectedObject(null);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [controlDialogOpen, boxEditDialogOpen, objectEditDialogOpen, objectCreateDialogOpen, sidebarOpen]);

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

      console.log("📍 Loaded objects:", arr.length);
      setObjects(arr);
      setFilteredObjects(arr);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Objekte:", e);
    }
  }, [token]);

  const loadBoxes = useCallback(
    async (objectId) => {
      try {
        console.log("📦 Fetching boxes for object:", objectId);

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

        console.log("📦 Loaded boxes:", boxesData.length);
        setBoxes(boxesData);
      } catch (e) {
        console.error("❌ Fehler beim Laden der Boxen:", e);
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

      console.log("📋 Loaded box types:", types.length);
      setBoxTypes(types);
    } catch (e) {
      console.error("❌ Fehler beim Laden der Boxtypen:", e);
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
        
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.flyTo([targetObject.lat, targetObject.lng], 18, {
              duration: 1.5,
            });
          }
        }, 500);
        
        setSearchParams({});
      }
    }
  }, [urlObjectId, urlFlyTo, objects, loadBoxes, setSearchParams]);

  useEffect(() => {
    if (selectedObject) {
      console.log("📦 Loading boxes for object:", selectedObject.id);
      loadBoxes(selectedObject.id);
      setSidebarOpen(true);
    } else {
      setBoxes([]);
      setSidebarOpen(false);
    }
  }, [selectedObject, loadBoxes]);

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleBoxClick = async (box) => {
    // Nur platzierte Boxen können angeklickt werden
    const isPlaced = box.position_type && box.position_type !== 'none';
    if (!isPlaced) {
      console.log("⚠️ Box ist nicht platziert, ignoriere Klick");
      return;
    }
    
    console.log("📦 Box clicked:", box);
    setSelectedBox(box);

    // Prüfen ob Ersteinrichtung nötig: Kein Box-Typ gesetzt = Ersteinrichtung
    const needsSetup = !box.box_type_id;

    if (needsSetup) {
      console.log("🔧 Ersteinrichtung nötig - BoxEditDialog öffnen");
      setIsFirstSetup(true);
      setBoxEditDialogOpen(true);
    } else {
      console.log("📋 Kontrolle - BoxScanDialog öffnen");
      setIsFirstSetup(false);
      setControlDialogOpen(true);
    }
  };

  const handleObjectClick = (obj) => {
    console.log("[OBJ] Object clicked:", obj);
    setSelectedObject(obj);
    loadBoxes(obj.id);
    setSidebarOpen(true);
    
    if (mapRef.current) {
      mapRef.current.flyTo([obj.lat, obj.lng], 18, {
        duration: 1.0,
      });
    }
  };

  /* ============================================================
     DRAG & DROP - Box auf Karte platzieren
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
      console.log("📍 Box dropped:", box.qr_code || box.id);

      // Pixel-Position relativ zum Map-Container berechnen
      const mapWrapper = mapWrapperRef.current;
      if (!mapWrapper || !mapRef.current) return;

      const rect = mapWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Pixel zu LatLng konvertieren
      const point = L.point(x, y);
      const latlng = mapRef.current.containerPointToLatLng(point);

      console.log("📍 Drop position:", latlng.lat, latlng.lng);

      // Box auf Karte platzieren via API
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
        console.log("✅ Box platziert!", placedBox);

        // Box mit Object-Daten anreichern für Dialoge
        const enrichedBox = {
          ...placedBox,
          objects: selectedObject,
          box_types: boxTypes.find(t => t.id === placedBox.box_type_id)
        };

        setSelectedBox(enrichedBox);

        // Prüfen ob Ersteinrichtung nötig: Kein Box-Typ = Ersteinrichtung
        const needsSetup = !placedBox.box_type_id;

        if (needsSetup) {
          console.log("🔧 Ersteinrichtung - BoxEditDialog öffnen");
          setIsFirstSetup(true);
          setBoxEditDialogOpen(true);
        } else {
          console.log("📋 Kontrolle - BoxScanDialog öffnen");
          setIsFirstSetup(false);
          setControlDialogOpen(true);
        }

        // Boxen neu laden
        if (selectedObject) {
          loadBoxes(selectedObject.id);
        }
      } else {
        const err = await res.json();
        console.error("❌ Platzierung fehlgeschlagen:", err);
        alert(err.error || 'Fehler beim Platzieren der Box');
      }
    } catch (err) {
      console.error("❌ Drop error:", err);
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
      console.error("❌ Address search error:", e);
    }
  };

  const selectAddress = (result) => {
    if (mapRef.current) {
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
        // Box Position verschieben Modus
        if (repositionBox) {
          handleRepositionBox(e.latlng);
          return;
        }
        
        if (objectPlacingMode) {
          setTempObjectLatLng(e.latlng);
          setObjectCreateDialogOpen(true);
          return;
        }
      },
    });

    return null;
  }

  // Box an neue Position verschieben
  const handleRepositionBox = async (latlng) => {
    if (!repositionBox) return;
    
    try {
      const res = await fetch(`${API}/boxes/${repositionBox.id}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ lat: latlng.lat, lng: latlng.lng })
      });
      
      if (res.ok) {
        console.log("✅ Box verschoben:", latlng.lat, latlng.lng);
        // Boxen neu laden
        if (selectedObject) {
          loadBoxes(selectedObject.id);
        }
      } else {
        const err = await res.json();
        alert("Fehler: " + (err.error || "Position konnte nicht gespeichert werden"));
      }
    } catch (err) {
      console.error("Reposition error:", err);
      alert("Fehler beim Verschieben der Box");
    }
    
    // Modus beenden
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

        {/* Adress-Suche */}
        <div className="search-group">
          <Search size={18} className="search-icon" />
          <input
            className="object-search-input-v6"
            placeholder="Adresse suchen..."
            value={addressSearchQuery}
            onChange={(e) => {
              setAddressSearchQuery(e.target.value);
              searchAddress(e.target.value);
            }}
          />
          {addressResults.length > 0 && (
            <div className="object-dropdown">
              {addressResults.map((res, i) => (
                <div
                  key={i}
                  className="object-dropdown-item"
                  onClick={() => selectAddress(res)}
                >
                  <span className="object-name">{res.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aktionen */}
        {canEdit && (
          <div className="header-actions-v6">
            <button
              className={`btn-action ${objectPlacingMode ? "active" : ""}`}
              onClick={() => {
                setObjectPlacingMode(!objectPlacingMode);
                setBoxPlacingMode(false);
              }}
            >
              <Plus size={16} />
              Objekt
            </button>
          </div>
        )}

        {/* Map Style Toggle */}
        <div className="style-toggle-v6">
          <button onClick={() => setStyleOpen(!styleOpen)}>
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
                🗺️ Straßen
              </button>

              <button
                className={mapStyle === "satellite" ? "active" : ""}
                onClick={() => {
                  setMapStyle("satellite");
                  setStyleOpen(false);
                }}
              >
                🛰️ Satellit
              </button>

              <button
                className={mapStyle === "hybrid" ? "active" : ""}
                onClick={() => {
                  setMapStyle("hybrid");
                  setStyleOpen(false);
                }}
              >
                🌍 Hybrid
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          PLACING MODE HINTS
          ============================================================ */}
      {objectPlacingMode && (
        <div className="placing-hint">
          Klicke auf die Karte, um ein neues Objekt zu erstellen
          <button onClick={() => setObjectPlacingMode(false)}>
            <X size={16} /> Abbrechen
          </button>
        </div>
      )}

      {/* Reposition Box Banner */}
      {repositionBox && (
        <div style={{
          position: "absolute",
          top: 70,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "#1f6feb",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          fontSize: 14,
          fontWeight: 500
        }}>
          <MapPin size={18} />
          Klicke auf die Karte um Box #{repositionBox.qr_code?.match(/(\d+)$/)?.[1] || repositionBox.id} zu verschieben
          <button 
            onClick={() => setRepositionBox(null)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              padding: "6px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13
            }}
          >
            <X size={14} /> Abbrechen
          </button>
        </div>
      )}

      {/* ============================================================
          MAP - Mit Drag & Drop Support
          ============================================================ */}
      <div 
        className={`map-wrapper-v6 ${isDraggingOver ? 'drag-over' : ''}`}
        ref={mapWrapperRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop Zone Indicator */}
        {isDraggingOver && (
          <div className="drop-zone-indicator">
            <div className="drop-zone-content">
              📍 Box hier platzieren
            </div>
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

          {/* Objects - nur mit Koordinaten! */}
          {objects.filter(obj => obj.lat && obj.lng).map((obj) => (
            <ObjectMarkerComponent
              key={obj.id}
              object={obj}
              isSelected={selectedObject?.id === obj.id}
              onSelect={handleObjectClick}
            />
          ))}

          {/* Boxes - nur platzierte anzeigen! */}
          {boxes
            .filter(box => box.lat && box.lng)
            .map((box) => (
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
            setIsFirstSetup(false);
            setBoxEditDialogOpen(true);
            setControlDialogOpen(false);
          }}
          onSave={() => {
            setControlDialogOpen(false);
            setSelectedBox(null);
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
          onAdjustPosition={(box) => {
            // Reposition-Modus aktivieren
            setControlDialogOpen(false);
            setRepositionBox(box);
            setSelectedBox(null);
          }}
          onSetGPS={(box) => {
            // GPS-Position holen (nur auf Mobil)
            setControlDialogOpen(false);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  const { latitude, longitude } = pos.coords;
                  try {
                    const res = await fetch(`${API}/boxes/${box.id}/location`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({ lat: latitude, lng: longitude })
                    });
                    if (res.ok) {
                      alert(`✅ GPS-Position gesetzt!`);
                      if (selectedObject) loadBoxes(selectedObject.id);
                    }
                  } catch (err) {
                    console.error("GPS error:", err);
                    alert("Fehler beim Setzen der GPS-Position");
                  }
                },
                (err) => {
                  alert("GPS nicht verfügbar: " + err.message);
                },
                { enableHighAccuracy: true }
              );
            }
            setSelectedBox(null);
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
          isFirstSetup={isFirstSetup}
          onClose={() => {
            setBoxEditDialogOpen(false);
            setSelectedBox(null);
            setIsFirstSetup(false);
          }}
          onSave={() => {
            setBoxEditDialogOpen(false);
            setSelectedBox(null);
            setIsFirstSetup(false);
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
          onAdjustPosition={() => {
            // Reposition-Modus aktivieren
            setBoxEditDialogOpen(false);
            setRepositionBox(selectedBox);
            setIsFirstSetup(false);
            setSelectedBox(null);
          }}
          onSetGPS={() => {
            // GPS nur auf Mobil - Prüfung im Dialog selbst
            setBoxEditDialogOpen(false);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  const { latitude, longitude } = pos.coords;
                  try {
                    const res = await fetch(`${API}/boxes/${selectedBox.id}/location`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({ lat: latitude, lng: longitude })
                    });
                    if (res.ok) {
                      alert(`✅ GPS-Position gesetzt!`);
                      if (selectedObject) loadBoxes(selectedObject.id);
                    }
                  } catch (err) {
                    console.error("GPS error:", err);
                    alert("Fehler beim Setzen der GPS-Position");
                  }
                },
                (err) => {
                  alert("GPS nicht verfügbar: " + err.message);
                },
                { enableHighAccuracy: true }
              );
            }
            setSelectedBox(null);
            setIsFirstSetup(false);
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
            setObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setFilteredObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelectedObject(updated);
            setObjectEditDialogOpen(false);
          }}
          onDelete={(id) => {
            setObjects((prev) => prev.filter((o) => o.id !== id));
            setFilteredObjects((prev) => prev.filter((o) => o.id !== id));
            setSelectedObject(null);
            setSidebarOpen(false);
            setObjectEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}