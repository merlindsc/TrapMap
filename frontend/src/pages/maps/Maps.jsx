/* ============================================================
   TRAPMAP — MAPS V6 PROFESSIONAL
   ✅ Sidebar mit allen Objekten (standardmäßig offen)
   ✅ Klick auf Objekt → Boxen laden
   ✅ Box-Klick → Kontrolle
   ✅ GPS Verschieben
   ✅ Object/Box Edit Dialogs
   ✅ Audit Report
   ============================================================ */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { Plus, Layers3, Search, Move, Menu, FileText } from "lucide-react";
import "./Maps.css";

// Components
import ObjectSidebar from "./ObjectSidebar";
import BoxControlDialog from "./BoxControlDialog";
import BoxEditDialog from "./BoxEditDialog";
import ObjectCreateDialog from "./ObjectCreateDialog";
import ObjectEditDialog from "./ObjectEditDialog";
import BoxCreateDialog from "./BoxCreateDialog";
import ReportDialog from "./ReportDialog";

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
      <div style="transform: rotate(45deg); color: white; font-size: 18px; font-weight: bold;">🏢</div>
    </div>`,
    className: "custom-object-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const createBoxIcon = (boxType, status = "green") => {
  const colors = {
    green: "#10b981",
    yellow: "#eab308",
    orange: "#fb923c",
    red: "#dc2626",
    gray: "#6b7280",
    blue: "#3b82f6",
  };

  const color = colors[status] || colors.green;

  const icons = {
    schlagfalle: "🪤",
    giftbox: "🐭",
    monitoring_rodent: "🧀",
    monitoring_insect: "🦟",
    uv_light: "💡",
    default: "📦",
  };

  const icon = icons[boxType] || icons.default;

  return L.divIcon({
    html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold;">${icon}</div>`,
    className: "custom-box-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

/* ============================================================
   BOX MARKER
   ============================================================ */
function BoxMarker({ box, onClick, isRelocating }) {
  const getBoxType = (box) => {
    const typeName = (box.box_type_name || "").toLowerCase();
    
    if (typeName.includes("schlag") || typeName.includes("trap")) return "schlagfalle";
    if (typeName.includes("gift") || typeName.includes("bait") || typeName.includes("köder")) return "giftbox";
    if (typeName.includes("monitoring") && (typeName.includes("maus") || typeName.includes("ratte"))) return "monitoring_rodent";
    if (typeName.includes("insekt") || typeName.includes("insect") || typeName.includes("uv")) return "monitoring_insect";
    
    return "default";
  };

  return (
    <Marker
      position={[box.lat, box.lng]}
      icon={createBoxIcon(getBoxType(box), isRelocating ? "blue" : (box.current_status || box.status))}
      eventHandlers={{
        click: () => onClick(box),
      }}
    />
  );
}

/* ============================================================
   OBJECT MARKER
   ============================================================ */
function ObjectMarkerComponent({ object, onSelect }) {
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
  const canEdit = user?.role === "admin" || user?.role === "editor" || user?.role === "supervisor";

  // Data
  const [objects, setObjects] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]);

  // Selected items
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);

  // UI State - Sidebar standardmäßig OFFEN
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [boxEditDialogOpen, setBoxEditDialogOpen] = useState(false);
  const [objectCreateDialogOpen, setObjectCreateDialogOpen] = useState(false);
  const [objectEditDialogOpen, setObjectEditDialogOpen] = useState(false);
  const [boxCreateDialogOpen, setBoxCreateDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Map
  const [mapStyle, setMapStyle] = useState("streets");
  const [styleOpen, setStyleOpen] = useState(false);

  // Placing modes
  const [objectPlacingMode, setObjectPlacingMode] = useState(false);
  const [boxPlacingMode, setBoxPlacingMode] = useState(false);
  const [tempObjectLatLng, setTempObjectLatLng] = useState(null);
  const [tempBoxLatLng, setTempBoxLatLng] = useState(null);

  // Relocate Mode
  const [relocateMode, setRelocateMode] = useState(false);
  const [relocatingBox, setRelocatingBox] = useState(null);

  // Search
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressResults, setAddressResults] = useState([]);

  const mapRef = useRef(null);

  /* ============================================================
     ESC KEY HANDLER
     ============================================================ */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (relocateMode) {
          setRelocateMode(false);
          setRelocatingBox(null);
          return;
        }
        
        if (reportDialogOpen) {
          setReportDialogOpen(false);
        } else if (controlDialogOpen) {
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
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [controlDialogOpen, boxEditDialogOpen, objectEditDialogOpen, objectCreateDialogOpen, boxCreateDialogOpen, relocateMode, reportDialogOpen]);

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

      console.log("🏢 Loaded objects:", arr.length);
      setObjects(arr);
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

  // Wenn Objekt ausgewählt, Boxen laden
  useEffect(() => {
    if (selectedObject) {
      console.log("🔄 Loading boxes for object:", selectedObject.id);
      loadBoxes(selectedObject.id);
    } else {
      setBoxes([]);
    }
  }, [selectedObject, loadBoxes]);

  /* ============================================================
     HANDLERS
     ============================================================ */

  const handleBoxClick = (box) => {
    if (relocateMode) return;
    
    console.log("📦 Box clicked:", box);
    setSelectedBox(box);
    setControlDialogOpen(true);
  };

  const handleObjectClick = (obj) => {
    if (relocateMode) return;
    
    console.log("🏢 Object clicked:", obj);
    setSelectedObject(obj);
    
    if (mapRef.current) {
      mapRef.current.flyTo([obj.lat, obj.lng], 18, {
        duration: 1.0,
      });
    }
  };

  /* ============================================================
     RELOCATE BOX
     ============================================================ */
  const handleRelocateBox = (box) => {
    setBoxEditDialogOpen(false);
    setRelocatingBox(box);
    setRelocateMode(true);
  };

  const saveNewLocation = async (latlng) => {
    if (!relocatingBox) return;

    try {
      const res = await fetch(`${API}/boxes/${relocatingBox.id}/location`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lat: latlng.lat,
          lng: latlng.lng,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Relocate error:", err);
        return;
      }

      console.log("✅ Box relocated to:", latlng);
      
      if (selectedObject) {
        loadBoxes(selectedObject.id);
      }
    } catch (e) {
      console.error("❌ Relocate error:", e);
    } finally {
      setRelocateMode(false);
      setRelocatingBox(null);
    }
  };

  /* ============================================================
     ADDRESS SEARCH (Mapbox Geocoding)
     ============================================================ */

  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setAddressResults([]);
      return;
    }

    try {
      const countries = "de,at,ch,nl,be,lu,pl,cz,dk,fr";
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=${countries}&language=de&limit=5&types=address,poi,place,locality`
      );
      
      const data = await res.json();
      
      const results = (data.features || []).map(f => ({
        display_name: f.place_name,
        lat: f.center[1],
        lon: f.center[0]
      }));
      
      setAddressResults(results);
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
        if (relocateMode && relocatingBox) {
          saveNewLocation(e.latlng);
          return;
        }

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
          RELOCATE BANNER
          ============================================================ */}
      {relocateMode && (
        <div style={{
          position: "absolute",
          top: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "#3b82f6",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <Move size={20} />
          <span>Klicke auf die neue Position für <b>Box {relocatingBox?.number || relocatingBox?.box_name}</b></span>
          <button
            onClick={() => {
              setRelocateMode(false);
              setRelocatingBox(null);
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "4px",
              padding: "4px 12px",
              color: "white",
              cursor: "pointer",
              marginLeft: "8px"
            }}
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* ============================================================
          HEADER
          ============================================================ */}
      <div className="maps-header-v6">
        {/* Sidebar Toggle */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: sidebarOpen ? "#6366f1" : "#1a1a1a",
            border: "1px solid #404040",
            borderRadius: "6px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Menu size={20} color="#fff" />
        </button>

        {/* Adress-Suche (Mapbox) */}
        <div className="search-group" style={{ flex: 1, maxWidth: "400px" }}>
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
        {canEdit && !relocateMode && (
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

        {selectedObject && canEdit && !relocateMode && (
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

        {/* Report Button */}
        <button
          className="action-btn-v6"
          onClick={() => setReportDialogOpen(true)}
          title="Audit-Report erstellen"
        >
          <FileText size={16} /> Report
        </button>

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
          MAP
          ============================================================ */}
      <div className="map-wrapper-v6" style={{ cursor: relocateMode ? "crosshair" : "grab" }}>
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

          {/* Objects */}
          {objects.filter(obj => obj.lat && obj.lng).map((obj) => (
            <ObjectMarkerComponent
              key={obj.id}
              object={obj}
              onSelect={handleObjectClick}
            />
          ))}

          {/* Boxes */}
          {boxes.filter(box => box.lat && box.lng).map((box) => (
            <BoxMarker
              key={box.id}
              box={box}
              onClick={handleBoxClick}
              isRelocating={relocatingBox?.id === box.id}
            />
          ))}
        </MapContainer>

        {/* Zoom Buttons */}
        <div className="zoom-buttons-v6">
          <button onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button onClick={() => mapRef.current?.zoomOut()}>−</button>
        </div>
      </div>

      {/* ============================================================
          SIDEBAR - Alle Objekte
          ============================================================ */}
      {sidebarOpen && !relocateMode && (
        <ObjectSidebar
          objects={objects}
          selectedObject={selectedObject}
          boxes={boxes}
          onClose={() => setSidebarOpen(false)}
          onSelectObject={(obj) => {
            setSelectedObject(obj);
            if (obj && mapRef.current) {
              mapRef.current.flyTo([obj.lat, obj.lng], 18, { duration: 1.0 });
            }
          }}
          onBoxClick={handleBoxClick}
          onEditObject={() => setObjectEditDialogOpen(true)}
          onCreateBox={() => setBoxPlacingMode(true)}
        />
      )}

      {/* ============================================================
          CONTROL DIALOG
          ============================================================ */}
      {controlDialogOpen && selectedBox && (
        <BoxControlDialog
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
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
          onDelete={() => {
            setBoxEditDialogOpen(false);
            setSelectedBox(null);
            if (selectedObject) {
              loadBoxes(selectedObject.id);
            }
          }}
          onRelocate={handleRelocateBox}
        />
      )}

      {/* ============================================================
          OBJECT EDIT DIALOG
          ============================================================ */}
      {objectEditDialogOpen && selectedObject && (
        <ObjectEditDialog
          object={selectedObject}
          onClose={() => setObjectEditDialogOpen(false)}
          onSave={() => {
            setObjectEditDialogOpen(false);
            loadObjects();
          }}
          onDelete={() => {
            setObjectEditDialogOpen(false);
            setSelectedObject(null);
            setBoxes([]);
            loadObjects();
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
            setSelectedObject(newObject);
            setObjectCreateDialogOpen(false);
            setTempObjectLatLng(null);
            setObjectPlacingMode(false);
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
            loadBoxes(selectedObject.id);
          }}
        />
      )}

      {/* ============================================================
          REPORT DIALOG
          ============================================================ */}
      {reportDialogOpen && (
        <ReportDialog onClose={() => setReportDialogOpen(false)} />
      )}
    </div>
  );
}