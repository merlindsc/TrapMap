/* ============================================================
   TRAPMAP - BOX EDIT DIALOG V3 (OFFLINE-FÄHIG)
   Bearbeiten einer Box - Mit Box-Name/Nummer Anzeige
   + QR-Code Info wenn unterschiedlich
   + Insektentyp-Auswahl für Insektenmonitore
   + VOLLSTÄNDIGE OFFLINE-UNTERSTÜTZUNG
   
   FEATURES:
   - 🆕 BoxTypes aus Cache laden
   - 🆕 Offline-Speicherung von Änderungen
   - 🆕 GPS-Position offline speichern
   - 🆕 Visueller Offline-Indikator
   ============================================================ */

import { useState, useEffect } from "react";
import { X, Save, CheckCircle, MapPin, Navigation, Clock, Bug, Hash, Tag, Maximize2, WifiOff, Cloud, ArrowRight, Building2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getBoxShortLabel } from "../../utils/boxUtils";
import { useTheme } from "../../context/ThemeContext";

// 🆕 Offline API Imports
import { 
  getBoxTypes, 
  updateBoxOffline, 
  createSetupScan,
  updateBoxPosition,
  isOnline 
} from "../../utils/offlineAPI";
import { useOffline } from "../../context/OfflineContext";

// Mini-Karte Icon - Box GRÜN & KLEIN
const gpsMarkerIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width: 5px; height: 5px;
    background: #22c55e;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    z-index: 1000;
  "></div>`,
  iconSize: [5, 5],
  iconAnchor: [2.5, 2.5]
});

// Map Centerer Component
function MapCenterer({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 18);
    }
  }, [position, map]);
  return null;
}

// QR-Nummer extrahieren
const getShortQr = (box) => {
  if (box?.qr_code) {
    const match = box.qr_code.match(/(\d+)/);
    if (match) return parseInt(match[1], 10).toString();
  }
  return null;
};

export default function BoxEditDialog({
  box,
  boxTypes: propBoxTypes = [],
  onClose,
  onSave,
  onAdjustPosition,
  onSetGPS,
  isFirstSetup = false
}) {
  // Theme Context
  const { theme } = useTheme();
  
  // 🆕 Offline Context
  const { isOnline: contextIsOnline, pendingCount, updatePendingCount } = useOffline();
  const currentlyOffline = !isOnline();
  
  // BoxTypes State - 🆕 mit Offline-Support
  const [boxTypes, setBoxTypes] = useState(propBoxTypes);
  const [boxTypesLoading, setBoxTypesLoading] = useState(false);
  const [boxTypesOffline, setBoxTypesOffline] = useState(false);

  // Required Fields
  const [requiredFields, setRequiredFields] = useState({
    bait: false,
    insect_type: false,
    notes: false,
    photo: false,
    gps: false
  });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("trapmap_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.organisation?.required_fields) {
          setRequiredFields(user.organisation.required_fields);
        }
      }
    } catch (err) {
      console.error("Error loading org settings:", err);
    }
  }, []);

  // Form State
  const [boxName, setBoxName] = useState(box?.box_name || "");
  const [displayNumber, setDisplayNumber] = useState(box?.display_number || box?.number || "");
  const [boxTypeId, setBoxTypeId] = useState(box?.box_type_id || "");
  const [bait, setBait] = useState(box?.bait || "");
  const [customBait, setCustomBait] = useState("");
  const [notes, setNotes] = useState(box?.notes || "");
  
  // Insektentyp
  const [insectType, setInsectType] = useState("");
  const [customInsectType, setCustomInsectType] = useState("");
  
  // Intervall
  const [intervalType, setIntervalType] = useState("fixed");
  const [intervalFixed, setIntervalFixed] = useState(box?.control_interval_days || 30);
  const [intervalRangeStart, setIntervalRangeStart] = useState(20);
  const [intervalRangeEnd, setIntervalRangeEnd] = useState(30);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // GPS State für Ersteinrichtung
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSaved, setGpsSaved] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsRequested, setGpsRequested] = useState(false);
  
  // State für Box-Transfer
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferObjects, setTransferObjects] = useState([]);
  const [selectedTargetObject, setSelectedTargetObject] = useState(null);
  
  // Mobile Detection
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

  // QR-Info
  const qrNumber = getShortQr(box);
  const hasCustomNumber = displayNumber && displayNumber.toString() !== qrNumber;

  // Köder-Optionen
  const COMMON_BAITS = [
    "Brodifacoum Block",
    "Bromadiolon Paste",
    "Difenacoum Block",
    "Difethialon Block",
    "Flocoumafen Paste",
    "Chlorophacinon Getreide",
    "Coumatetralyl Block",
    "Brodifacoum Paste",
    "Bromadiolon Block",
    "Difenacoum Paste"
  ];

  const INSECT_TYPES = [
    "Schaben", "Motten", "Käfer", "Bettwanzen",
    "Ameisen", "Silberfische", "Fliegen", "Wespen"
  ];

  const QUICK_INTERVALS = [
    { value: 7, label: "7 Tage", sub: "wöchentlich" },
    { value: 14, label: "14 Tage", sub: "2 Wochen" },
    { value: 21, label: "21 Tage", sub: "3 Wochen" },
    { value: 30, label: "30 Tage", sub: "monatlich" },
    { value: 60, label: "60 Tage", sub: "2 Monate" },
    { value: 90, label: "90 Tage", sub: "quartalsweise" }
  ];

  // 🆕 BoxTypes laden - OFFLINE-FÄHIG
  useEffect(() => {
    if (boxTypes.length === 0 && !boxTypesLoading) {
      loadBoxTypes();
    }
  }, []);

  // Prop-Update übernehmen
  useEffect(() => {
    if (propBoxTypes.length > 0) {
      setBoxTypes(propBoxTypes);
    }
  }, [propBoxTypes]);

  const loadBoxTypes = async () => {
    setBoxTypesLoading(true);
    try {
      const result = await getBoxTypes();
      
      if (result.success) {
        setBoxTypes(result.data || []);
        setBoxTypesOffline(result.offline || false);
        console.log("✅ BoxTypes geladen:", result.data.length, result.offline ? "(offline)" : "(online)");
      } else {
        console.error("BoxTypes laden fehlgeschlagen");
      }
    } catch (err) {
      console.error("BoxTypes laden fehlgeschlagen:", err);
    }
    setBoxTypesLoading(false);
  };

  // Initialisiere Box-Daten
  useEffect(() => {
    if (box?.box_type_id) setBoxTypeId(box.box_type_id);
    if (box?.box_name) setBoxName(box.box_name);
    if (box?.display_number || box?.number) setDisplayNumber(box.display_number || box.number);
    if (box?.notes) {
      const foundInsect = INSECT_TYPES.find(t => box.notes.includes(t));
      if (foundInsect) {
        setInsectType(foundInsect);
        setNotes(box.notes.replace(`Ziel: ${foundInsect}`, "").replace(foundInsect, "").trim());
      } else {
        setNotes(box.notes);
      }
    }
    if (box?.control_interval_days) {
      setIntervalFixed(box.control_interval_days);
      const isStandard = QUICK_INTERVALS.some(q => q.value === box.control_interval_days);
      if (!isStandard && box.control_interval_days > 7) {
        setIntervalType("range");
        setIntervalRangeStart(box.control_interval_days - 5);
        setIntervalRangeEnd(box.control_interval_days + 5);
      }
    }
    if (box?.bait) {
      if (COMMON_BAITS.includes(box.bait)) {
        setBait(box.bait);
      } else {
        setBait("custom");
        setCustomBait(box.bait);
      }
    }
    
    // Prüfen ob Box bereits GPS hat
    if (box?.lat && box?.lng) {
      console.log("📍 Box hat bereits GPS:", box.lat, box.lng);
      setGpsPosition({ lat: box.lat, lng: box.lng });
      setGpsSaved(true);
    }
  }, [box]);

  // AUTOMATISCH GPS anfordern bei Ersteinrichtung auf Mobile
  useEffect(() => {
    if (!box?.id) return;
    if (!isFirstSetup || !isMobile) return;
    if (box?.lat && box?.lng) return;
    if (gpsRequested || gpsLoading) return;
    
    console.log("📍 Ersteinrichtung: Fordere GPS an...");
    setGpsRequested(true);
    requestGPSPosition();
  }, [box?.id, isFirstSetup, isMobile, box?.lat, box?.lng, gpsRequested, gpsLoading]);

  // 🆕 GPS-Position anfordern und speichern - OFFLINE-FÄHIG
  const requestGPSPosition = async () => {
    if (!navigator.geolocation) {
      setGpsError("GPS nicht verfügbar");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    console.log("📍 GPS wird angefordert...");

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });

      console.log("📍 GPS Position erhalten:", position);
      setGpsPosition(position);

      // 🆕 Position speichern - OFFLINE-FÄHIG
      if (box?.id) {
        try {
          const result = await updateBoxPosition(box.id, position.lat, position.lng, 'gps');

          if (result.success) {
            console.log(result.online ? "✅ GPS Position online gespeichert" : "📴 GPS Position offline gespeichert");
            setGpsSaved(true);
            
            if (updatePendingCount) {
              updatePendingCount();
            }
          }
        } catch (saveErr) {
          console.error("GPS save error:", saveErr);
        }
      }

      setGpsLoading(false);
    } catch (err) {
      console.error("GPS error:", err);
      setGpsLoading(false);
      setGpsError(err.message || "GPS-Position konnte nicht ermittelt werden");
    }
  };

  // Box-Typ Erkennung
  const selectedType = boxTypes.find(t => t.id === parseInt(boxTypeId));
  const typeCategory = selectedType?.category?.toLowerCase() || "";
  const isRodentStation = typeCategory === "bait_box";
  const isInsectMonitor = typeCategory === "insect_monitor" || typeCategory === "uv_trap";

  const getFinalInterval = () => {
    if (intervalType === "fixed") return intervalFixed;
    return Math.floor((intervalRangeStart + intervalRangeEnd) / 2);
  };

  const buildFinalNotes = () => {
    let finalNotes = notes.trim();
    if (isInsectMonitor && insectType) {
      const insectInfo = insectType === "custom" ? customInsectType : insectType;
      if (insectInfo) {
        finalNotes = `Ziel: ${insectInfo}${finalNotes ? ` | ${finalNotes}` : ""}`;
      }
    }
    return finalNotes;
  };

  // 🆕 Box Transfer Handlers
  const handleOpenTransferDialog = async () => {
    try {
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
        setError("Objekte konnten nicht geladen werden");
      }
    } catch (e) {
      console.error("Error loading objects:", e);
      setError("Fehler beim Laden der Objekte");
    }
  };

  const handleTransferBox = async () => {
    if (!selectedTargetObject) {
      setError("Bitte wähle ein Zielobjekt");
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
        setShowTransferDialog(false);
        // Gebe die neue object_id zurück für Fly-To
        onSave && onSave(selectedTargetObject);
        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Verschieben");
      }
    } catch (e) {
      console.error("Transfer error:", e);
      setError(e.message);
    } finally {
      setTransferLoading(false);
    }
  };

  // 🆕 handleSave - OFFLINE-FÄHIG
  const handleSave = async () => {
    if (!boxTypeId) {
      setError("Bitte Box-Typ auswählen");
      return;
    }

    const finalBait = bait === "custom" ? customBait : bait;
    if (requiredFields.bait && isRodentStation && !finalBait) {
      setError("Köder ist ein Pflichtfeld");
      return;
    }

    const finalInsectType = insectType === "custom" ? customInsectType : insectType;
    if (requiredFields.insect_type && isInsectMonitor && !finalInsectType) {
      setError("Insektentyp ist ein Pflichtfeld");
      return;
    }

    if (requiredFields.notes && !notes.trim()) {
      setError("Notizen sind ein Pflichtfeld");
      return;
    }

    setSaving(true);
    setError(null);
    const finalInterval = getFinalInterval();
    const finalNotes = buildFinalNotes();

    try {
      const updateData = { 
        box_type_id: parseInt(boxTypeId), 
        notes: finalNotes,
        control_interval_days: finalInterval
      };
      
      // Box-Name speichern (optional)
      if (boxName.trim()) updateData.box_name = boxName.trim();
      // Box-Nummer wird NICHT mehr gespeichert - kommt automatisch vom QR-Code
      if (isRodentStation && finalBait) updateData.bait = finalBait;

      // 🆕 Offline-fähigen Update-Call
      const updateResult = await updateBoxOffline(box.id, updateData);

      if (!updateResult.success) {
        throw new Error(updateResult.message || "Fehler beim Speichern");
      }
      
      console.log(updateResult.online ? "✅ Box online aktualisiert" : "📴 Box offline aktualisiert");

      // Bei Ersteinrichtung: Setup-Scan erstellen
      if (isFirstSetup) {
        const scanResult = await createSetupScan(
          box.id, 
          { bait: finalBait, insect_type: finalInsectType },
          box.object_id || box.objects?.id
        );
        
        console.log(scanResult.online ? "✅ Setup-Scan online erstellt" : "📴 Setup-Scan offline erstellt");
      }

      // Pending Count aktualisieren
      if (updatePendingCount) {
        updatePendingCount();
      }

      // Gebe object_id zurück für Fly-To Funktion
      const objectId = box.object_id || box.objects?.id;
      onSave && onSave(objectId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getBoxHeaderNumber = () => {
    // Verwende boxUtils Helper für konsistente Anzeige
    if (box?.short_code) {
      return getBoxShortLabel(box);
    }
    // Fallback wenn short_code fehlt
    if (displayNumber) return displayNumber;
    if (qrNumber) return qrNumber;
    return box?.id || "?";
  };

  // Transfer Dialog Component (inline)
  const TransferDialog = () => {
    const [searchQuery, setSearchQuery] = useState("");
    
    const filteredObjects = transferObjects.filter(obj => 
      obj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.9)" }}
        onClick={() => {
          setShowTransferDialog(false);
          setSelectedTargetObject(null);
        }}
      >
        <div 
          className="bg-gray-900 rounded-xl border border-white/10 w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <ArrowRight size={16} />
              Box zu anderem Objekt verschieben
            </h3>
            <p className="text-xs text-gray-400">
              Wähle das Zielobjekt für {box?.short_code || 'diese Box'}
            </p>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              placeholder="Objekt suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Object List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredObjects.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Keine Objekte gefunden
              </div>
            ) : (
              filteredObjects.map(obj => (
                <button
                  key={obj.id}
                  onClick={() => setSelectedTargetObject(obj.id)}
                  className={`w-full p-3 mb-1 rounded-lg border text-left transition-all ${
                    selectedTargetObject === obj.id
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-white/10 text-white hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <Building2 size={14} />
                    {obj.name}
                  </div>
                  {obj.address && (
                    <div className="text-xs text-gray-400 mt-1">
                      {obj.address}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex gap-2">
            <button
              onClick={() => {
                setShowTransferDialog(false);
                setSelectedTargetObject(null);
              }}
              disabled={transferLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:bg-gray-800 transition-colors text-sm"
            >
              Abbrechen
            </button>
            <button
              onClick={handleTransferBox}
              disabled={transferLoading || !selectedTargetObject}
              className={`flex-1 px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors ${
                (!selectedTargetObject || transferLoading)
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {transferLoading ? "Verschieben..." : "Verschieben"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Transfer Dialog */}
      {showTransferDialog && <TransferDialog />}

      {/* Main Dialog */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md max-h-[90vh] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 dark:border-white/20 bg-gray-950 dark:bg-black">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isFirstSetup ? 'bg-green-500/20 dark:bg-green-500/30 text-green-400' : 'bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-400'} rounded-lg flex items-center justify-center font-bold text-sm`}>
              {getBoxHeaderNumber()}
            </div>
            <div>
              <h2 className="font-semibold text-white dark:text-gray-100 flex items-center gap-2">
                {isFirstSetup ? "Ersteinrichtung" : "Box bearbeiten"}
                {box?.box_name && (
                  <span className="text-indigo-400 font-normal text-sm">
                    {box.box_name}
                  </span>
                )}
                {/* 🆕 Offline-Badge */}
                {currentlyOffline && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 rounded text-yellow-400 text-xs flex items-center gap-1">
                    <WifiOff size={10} /> Offline
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {box?.qr_code && (
                  <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1 font-mono text-gray-900 dark:text-gray-100">
                    <Hash size={10} />
                    {box.qr_code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-100 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* 🆕 Offline-Status Banner */}
          {(currentlyOffline || pendingCount > 0) && (
            <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
              currentlyOffline 
                ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
            }`}>
              {currentlyOffline ? (
                <>
                  <WifiOff size={16} />
                  <span>Offline-Modus - Änderungen werden später synchronisiert</span>
                </>
              ) : (
                <>
                  <Cloud size={16} />
                  <span>{pendingCount} ausstehende Synchronisation(en)</span>
                </>
              )}
            </div>
          )}
          
          {/* Ersteinrichtung Info */}
          {isFirstSetup && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              Ersteinrichtungs-Scan wird automatisch erstellt
            </div>
          )}

          {/* GPS Status bei Ersteinrichtung auf Mobile */}
          {isFirstSetup && isMobile && (
            <div className={`rounded-lg p-3 flex items-center gap-3 text-sm ${
              gpsSaved 
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : gpsLoading
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  : gpsError
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-gray-500/10 border border-gray-500/20 text-gray-400"
            }`}>
              {gpsLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>GPS-Position wird ermittelt...</span>
                </>
              ) : gpsSaved ? (
                <>
                  <Navigation size={16} className="text-green-400" />
                  <span className="flex-1">GPS-Position gespeichert</span>
                  {gpsPosition && (
                    <span className="text-xs text-green-400/60 font-mono">
                      {gpsPosition.lat.toFixed(5)}, {gpsPosition.lng.toFixed(5)}
                    </span>
                  )}
                </>
              ) : gpsError ? (
                <>
                  <Navigation size={16} className="text-red-400" />
                  <span className="flex-1">{gpsError}</span>
                  <button
                    onClick={requestGPSPosition}
                    className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs"
                  >
                    Erneut
                  </button>
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  <span>GPS-Position ausstehend</span>
                </>
              )}
            </div>
          )}

          {/* Mini-Karte bei Ersteinrichtung wenn GPS gespeichert */}
          {isFirstSetup && gpsSaved && gpsPosition && (
            <div className="rounded-xl overflow-hidden border border-white/10">
              <div style={{ height: "140px", position: "relative" }}>
                <MapContainer
                  center={[gpsPosition.lat, gpsPosition.lng]}
                  zoom={18}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                  dragging={false}
                  touchZoom={false}
                  doubleClickZoom={false}
                  scrollWheelZoom={false}
                  attributionControl={false}
                >
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxNativeZoom={17}
                    maxZoom={20}
                  />
                  <Marker position={[gpsPosition.lat, gpsPosition.lng]} icon={gpsMarkerIcon} />
                  <MapCenterer position={[gpsPosition.lat, gpsPosition.lng]} />
                </MapContainer>
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Position gesetzt
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* BOX-TYP */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 flex items-center gap-2">
              📦 Box-Typ *
              {/* 🆕 Offline-Badge für BoxTypes */}
              {boxTypesOffline && (
                <span className="px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-400 text-[10px] flex items-center gap-1">
                  <WifiOff size={8} /> Cache
                </span>
              )}
            </label>
            {boxTypesLoading ? (
              <div className="w-full px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-gray-500 text-sm">
                Lade Box-Typen...
              </div>
            ) : boxTypes.length === 0 ? (
              <div className="w-full px-3 py-2.5 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                ⚠️ Keine Box-Typen verfügbar {currentlyOffline && "- Cache leer"}
              </div>
            ) : (
              <select
                value={boxTypeId}
                onChange={(e) => setBoxTypeId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white dark:text-gray-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="">Bitte auswählen...</option>
                
                {boxTypes.some(t => t.category) ? (
                  <>
                    {boxTypes.filter(t => t.category === 'bait_box').length > 0 && (
                      <optgroup label="🐀 Nager - Köder">
                        {boxTypes
                          .filter(t => t.category === 'bait_box')
                          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                          .map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                      </optgroup>
                    )}
                    
                    {boxTypes.filter(t => t.category === 'snap_trap').length > 0 && (
                      <optgroup label="🐀 Nager - Schlagfallen">
                        {boxTypes
                          .filter(t => t.category === 'snap_trap')
                          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                          .map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                      </optgroup>
                    )}
                    
                    {boxTypes.filter(t => t.category === 'insect_monitor' || t.category === 'uv_trap').length > 0 && (
                      <optgroup label="🪲 Insekten">
                        {boxTypes
                          .filter(t => t.category === 'insect_monitor' || t.category === 'uv_trap')
                          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                          .map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                      </optgroup>
                    )}
                    
                    {boxTypes.filter(t => 
                      !['bait_box', 'snap_trap', 'insect_monitor', 'uv_trap'].includes(t.category)
                    ).length > 0 && (
                      <optgroup label="📦 Sonstige">
                        {boxTypes
                          .filter(t => !['bait_box', 'snap_trap', 'insect_monitor', 'uv_trap'].includes(t.category))
                          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                          .map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  boxTypes
                    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                    .map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))
                )}
              </select>
            )}
          </div>

          {/* BOX-NAME */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
              <Tag size={12} />
              Name (optional)
            </label>
            <input
              type="text"
              value={boxName}
              onChange={(e) => setBoxName(e.target.value)}
              placeholder="z.B. Eingang Lager, Kühlraum Nord"
              className="w-full px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white dark:text-gray-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">Wird zusammen mit dem Kürzel angezeigt (z.B. RK-12 Eingang)</p>
          </div>

          {/* BOX-NUMMER (automatisch aus QR-Code) */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
              <Hash size={12} />
              Box-Nummer
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 bg-gray-900 border border-white/10 rounded-lg text-white text-sm font-mono flex items-center gap-2">
                <span className="text-lg font-bold">{qrNumber || displayNumber || '-'}</span>
                {box?.qr_code && (
                  <span className="text-gray-500 text-xs">({box.qr_code})</span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Die Box-Nummer wird automatisch aus dem QR-Code abgeleitet und kann nicht geändert werden.
            </p>
          </div>

          {/* Köder */}
          {isRodentStation && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Rodentizid / Köder {requiredFields.bait && <span className="text-red-400">*</span>}
              </label>
              <select
                value={bait}
                onChange={(e) => {
                  setBait(e.target.value);
                  if (e.target.value !== "custom") setCustomBait("");
                }}
                className="w-full px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="">Kein Köder / Leer</option>
                {COMMON_BAITS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="custom">Anderer...</option>
              </select>
              {bait === "custom" && (
                <input
                  type="text"
                  value={customBait}
                  onChange={(e) => setCustomBait(e.target.value)}
                  placeholder="Köder eingeben..."
                  className="w-full mt-2 px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white dark:text-gray-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                />
              )}
            </div>
          )}

          {/* Zielinsekt */}
          {isInsectMonitor && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
                <Bug size={14} />
                Zielinsekt {requiredFields.insect_type && <span className="text-red-400">*</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INSECT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInsectType(insectType === type ? "" : type)}
                    className={`py-2.5 px-3 rounded-lg text-sm text-left transition-all ${
                      insectType === type
                        ? "bg-purple-500/20 dark:bg-purple-500/30 text-purple-400 border border-purple-500/50 dark:border-purple-500/60"
                        : "bg-gray-950 dark:bg-black text-gray-300 dark:text-gray-400 border border-white/10 dark:border-white/20 hover:border-purple-500/30"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setInsectType(insectType === "custom" ? "" : "custom")}
                className={`w-full mt-2 py-2.5 px-3 rounded-lg text-sm text-left transition-all ${
                  insectType === "custom"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                    : "bg-gray-950 dark:bg-black text-gray-300 border border-white/10 dark:border-white/20 hover:border-purple-500/30"
                }`}
              >
                Anderes Insekt...
              </button>
              {insectType === "custom" && (
                <input
                  type="text"
                  value={customInsectType}
                  onChange={(e) => setCustomInsectType(e.target.value)}
                  placeholder="Insektenart eingeben..."
                  className="w-full mt-2 px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white dark:text-gray-100 text-sm focus:border-purple-500 focus:outline-none transition-colors"
                />
              )}
            </div>
          )}

          {/* Kontrollintervall */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
              <Clock size={14} />
              Kontrollintervall
            </label>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIntervalType("fixed")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  intervalType === "fixed"
                    ? "bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-400 border border-indigo-500/50 dark:border-indigo-500/60"
                    : "bg-gray-950 dark:bg-black text-gray-400 dark:text-gray-500 border border-white/10 dark:border-white/20 hover:border-white/20"
                }`}
              >
                Fix
              </button>
              <button
                type="button"
                onClick={() => setIntervalType("range")}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  intervalType === "range"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                    : "bg-gray-950 dark:bg-black text-gray-400 border border-white/10 dark:border-white/20 hover:border-white/20"
                }`}
              >
                Range
              </button>
            </div>

            {intervalType === "fixed" && (
              <div className="grid grid-cols-3 gap-2">
                {QUICK_INTERVALS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setIntervalFixed(q.value)}
                    className={`py-2.5 px-2 rounded-lg text-center transition-all ${
                      intervalFixed === q.value
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-950 dark:bg-black text-gray-300 dark:text-gray-400 border border-white/10 dark:border-white/20 hover:border-indigo-500/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{q.label}</div>
                    <div className={`text-xs ${intervalFixed === q.value ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {q.sub}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {intervalType === "range" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Von</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={intervalRangeStart}
                      onChange={(e) => setIntervalRangeStart(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white text-center text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-gray-500 pt-5">–</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Bis</label>
                    <input
                      type="number"
                      min={intervalRangeStart}
                      max="365"
                      value={intervalRangeEnd}
                      onChange={(e) => setIntervalRangeEnd(parseInt(e.target.value) || intervalRangeStart)}
                      className="w-full px-3 py-2 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white text-center text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-gray-400 pt-5 text-sm">Tage</span>
                </div>
                
                <div className="bg-gray-950 dark:bg-black rounded-lg p-3 text-center">
                  <span className="text-gray-400 dark:text-gray-500 text-sm">Kontrolle alle </span>
                  <span className="text-indigo-400 font-semibold">{intervalRangeStart}–{intervalRangeEnd}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-sm"> Tage</span>
                </div>
              </div>
            )}
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Notizen {requiredFields.notes && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hinweise zur Box, Standort-Details..."
              rows={2}
              className="w-full px-3 py-2.5 bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 rounded-lg text-white dark:text-gray-100 text-sm resize-none focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Position Buttons - nur wenn nicht Ersteinrichtung */}
          {!isFirstSetup && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => { onAdjustPosition && onAdjustPosition(); }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 text-sm hover:bg-indigo-500/20 transition-colors"
              >
                <MapPin size={14} /> Position verschieben
              </button>
              
              {/* GPS Button NUR auf Mobile */}
              {isMobile && (
                <button
                  onClick={requestGPSPosition}
                  disabled={gpsLoading}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-colors ${
                    gpsSaved 
                      ? "bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 dark:border-green-500/40 text-green-400"
                      : gpsLoading
                        ? "bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 dark:border-blue-500/40 text-blue-400"
                        : "bg-gray-950 dark:bg-black border border-white/10 dark:border-white/20 text-gray-400 dark:text-gray-500 hover:border-white/20"
                  }`}
                >
                  {gpsLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      GPS...
                    </>
                  ) : gpsSaved ? (
                    <>
                      <CheckCircle size={14} /> GPS gespeichert
                    </>
                  ) : (
                    <>
                      <Navigation size={14} /> GPS aktualisieren
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Transfer Button */}
        {box?.object_id && !isFirstSetup && (
          <div className="px-4 pb-2">
            <button
              onClick={handleOpenTransferDialog}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
            >
              <ArrowRight size={14} />
              Zu anderem Objekt verschieben
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10 dark:border-white/20 bg-gray-950 dark:bg-black">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white/5 dark:bg-white/10 hover:bg-white/10 dark:hover:bg-white/15 border border-white/10 dark:border-white/20 rounded-lg text-gray-300 dark:text-gray-400 text-sm transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !boxTypeId}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              saving || !boxTypeId
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {currentlyOffline && <WifiOff size={14} />}
            <Save size={16} />
            {saving ? "..." : isFirstSetup ? (currentlyOffline ? "Offline einrichten" : "Einrichten") : (currentlyOffline ? "Offline speichern" : "Speichern")}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}