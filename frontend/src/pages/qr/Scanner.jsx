/* ============================================================
   TRAPMAP - QR SCANNER V2
   
   FEATURES:
   - Schnellkontrolle: BoxScanDialog direkt im Scanner
   - GPS-Distanz Check bei GPS-Boxen (>10m Warnung)
   - Platzierungsauswahl für nicht-platzierte Boxen
   - Nach Speichern → Scanner sofort wieder aktiv
   
   FLOW:
   1. Platziert (GPS/Lageplan) → BoxScanDialog → Speichern → Weiter scannen
   2. Zugewiesen, nicht platziert → Platzierungsauswahl
   3. Pool → Objekt-Zuweisung
   ============================================================ */

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { 
  Camera, X, RotateCcw, Flashlight, SwitchCamera,
  Package, Navigation, Layers, AlertTriangle,
  MapPin, CheckCircle, ArrowRight
} from "lucide-react";

// BoxScanDialog und BoxEditDialog importieren
import BoxScanDialog from "../../components/BoxScanDialog";
import BoxEditDialog from "../maps/BoxEditDialog";

const API = import.meta.env.VITE_API_URL;

// Distanz zwischen zwei GPS-Koordinaten berechnen (in Metern)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Erdradius in Metern
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

// Distanz formatieren: >500m in km, sonst in m
function formatDistance(meters) {
  if (meters >= 500) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)}m`;
}

export default function Scanner() {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  
  // Scanner State
  const [error, setError] = useState("");
  const [scannedCode, setScannedCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionState, setPermissionState] = useState("checking");
  const [cameras, setCameras] = useState([]);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Box State
  const [currentBox, setCurrentBox] = useState(null);
  const [boxLoading, setBoxLoading] = useState(false);
  const [processingCode, setProcessingCode] = useState(false); // Lock gegen Flackern
  
  // NOTE: removed persistent same-code blockade — rely on processing lock only
  
  // Mobile Detection (einmal berechnen)
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

  // View States
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showPlacementChoice, setShowPlacementChoice] = useState(false);
  const [showGPSWarning, setShowGPSWarning] = useState(false);
  const [showFirstSetup, setShowFirstSetup] = useState(false); // NEU: Ersteinrichtung
  
  // GPS State
  const [currentGPS, setCurrentGPS] = useState(null);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Platzierungsauswahl State
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [objectFloorplans, setObjectFloorplans] = useState([]);
  const [boxTypes, setBoxTypes] = useState([]); // NEU: Für Ersteinrichtung

  // Success Toast
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const { token } = useAuth();
  const tempBlockedCodeRef = useRef(null);
  const tempBlockedTimerRef = useRef(null);
  const SHORT_BLOCK_MS = 1500; // ignore immediate re-scan for 1.5s after refresh/save

  // ============================================
  // SCANNER INIT
  // ============================================
  useEffect(() => {
    initScanner();
    loadBoxTypes(); // BoxTypes für Ersteinrichtung laden
    return () => stopScanner(true); // true = clear() beim Unmount
  }, []);

  // BoxTypes laden
  const loadBoxTypes = async () => {
    try {
      const res = await axios.get(`${API}/boxtypes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBoxTypes(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Load box types error:", err);
    }
  };

  const initScanner = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Kamera wird von diesem Browser nicht unterstützt");
        setPermissionState("unsupported");
        return;
      }

      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        setError("Keine Kamera gefunden");
        setPermissionState("unsupported");
        return;
      }

      setCameras(devices);

      // Back-Kamera bevorzugen
      let selectedCamera = devices[0];
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("rück") ||
        d.label.toLowerCase().includes("environment")
      );
      
      if (backCamera) {
        selectedCamera = backCamera;
      } else if (devices.length > 1) {
        selectedCamera = devices[devices.length - 1];
      }

      setCurrentCamera(selectedCamera);
      setPermissionState("granted");
      
      await startScanner(selectedCamera.id);

    } catch (err) {
      console.error("Scanner init error:", err);
      
      if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        setError("Kamera-Zugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
        setPermissionState("denied");
      } else {
        setError(`Kamera-Fehler: ${err.message || err}`);
        setPermissionState("denied");
      }
    }
  };

  const startScanner = async (cameraId) => {
    console.log("🎥 startScanner called with camera:", cameraId);
    
    try {
      // WICHTIG: Erst sicher stoppen falls noch aktiv
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState();
          console.log("📊 Scanner state:", state);
          
          // State 2 = SCANNING - muss gestoppt werden
          if (state === 2) {
            console.log("⏹️ Stoppe laufenden Scanner...");
            await html5QrCodeRef.current.stop();
            console.log("✅ Scanner gestoppt");
          }
          
          // Instanz existiert und ist nicht am scannen - wiederverwenden!
          console.log("♻️ Verwende existierende Scanner-Instanz");
          
        } catch (stateErr) {
          // getState() kann fehlschlagen - dann neue Instanz
          console.log("⚠️ State check failed, erstelle neue Instanz:", stateErr.message);
          html5QrCodeRef.current = new Html5Qrcode("qr-reader");
        }
      } else {
        // Keine Instanz - neue erstellen
        console.log("🔧 Erstelle neue Scanner-Instanz...");
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      console.log("▶️ Starte Scanner...");
      await html5QrCodeRef.current.start(
        cameraId,
        config,
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
      setError("");
      console.log("✅ Scanner läuft!");

      // Kurzer Delay und Debug: Prüfe aktive Video-Track IDs (hilfreich beim Debuggen von Kamerareuse)
      setTimeout(() => {
        try {
          const v = document.querySelector('#qr-reader video');
          if (v && v.srcObject && typeof v.srcObject.getTracks === 'function') {
            const ids = v.srcObject.getTracks().map(t => `${t.kind}:${t.id}`);
            console.log('🎞️ Active video tracks after start:', ids);
          }
        } catch (e) {
          /* ignore */
        }
      }, 250);

      try {
        const capabilities = html5QrCodeRef.current.getRunningTrackCapabilities();
        setTorchSupported(capabilities?.torch === true);
      } catch (e) {
        setTorchSupported(false);
      }

    } catch (err) {
      console.error("❌ Scanner start error:", err);
      setIsScanning(false);
      setError("Scanner konnte nicht gestartet werden: " + (err.message || err));
    }
  };

  const stopScanner = async (clearElement = false) => {
    console.log("⏹️ stopScanner called, clearElement:", clearElement);
    
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        console.log("📊 Scanner state:", state);
        
        // State 2 = SCANNING - muss gestoppt werden
        if (state === 2) {
          await html5QrCodeRef.current.stop();
          console.log("✅ Scanner gestoppt");
        }
        
        // Clear nur wenn gewünscht UND Scanner nicht mehr läuft
        if (clearElement) {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
          console.log("🧹 Scanner cleared");
        }
      } catch (e) {
        console.error("Stop scanner error:", e.message);
      }
    }
    setIsScanning(false);
  };

  // ============================================
  // GPS POSITION HOLEN
  // ============================================
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation nicht unterstützt"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // ============================================
  // SCAN SUCCESS - HAUPTLOGIK
  // ============================================
  const onScanSuccess = async (decodedText, decodedResult) => {
    // WICHTIG: Lock prüfen - verhindert Flackern!
    if (!decodedText || processingCode) return;
    
    // URL-Format prüfen und Code extrahieren
    let code = decodedText;
    if (decodedText.includes("trap-map.de/s/")) {
      code = decodedText.split("/s/")[1];
    }
    
    // Lock setzen SOFORT (prevents rapid duplicate processing)
    setProcessingCode(true);
    setScannedCode(decodedText);
    // Wenn temporär derselbe Code geblockt ist, ignorieren
    if (tempBlockedCodeRef.current && code === tempBlockedCodeRef.current) {
      console.log(`⏱️ Ignoriere kurzfristigen Re-Scan von ${code}`);
      return;
    }

    console.log(`📱 Neuer Scan: ${code} (isMobile: ${isMobile})`);
    
    // Scanner SOFORT stoppen
    await stopScanner();

    // Vibration Feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    await handleCodeCheck(code);
  };

  const onScanFailure = (error) => {
    // Stille Fehler - kontinuierliches Scannen
  };

  // ============================================
  // CODE PRÜFEN UND ROUTING
  // ============================================
  const handleCodeCheck = async (code) => {
    setBoxLoading(true);
    setError("");

    try {
      console.log(`🔍 Prüfe Code: ${code}`);
      const res = await axios.get(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📦 API Response:", JSON.stringify(res.data, null, 2));

      // Code nicht in DB → Zur Registrierung
      if (!res.data || !res.data.box_id) {
        console.log("⚠️ Kein box_id - navigiere zur Registrierung");
        navigate(`/qr/assign/${code}`);
        return;
      }

      const boxData = res.data.boxes || res.data;
      const boxId = res.data.box_id;
      const objectId = boxData?.object_id;
      const positionType = boxData?.position_type;
      const floorPlanId = boxData?.floor_plan_id;
      const hasGPS = boxData?.lat && boxData?.lng;
      const hasFloorplanPosition = floorPlanId && boxData?.pos_x !== null && boxData?.pos_y !== null;

      console.log("📊 Box-Status:", {
        boxId,
        objectId,
        positionType,
        hasGPS,
        hasFloorplanPosition,
        lat: boxData?.lat,
        lng: boxData?.lng
      });

      // Box-Daten speichern
      setCurrentBox({
        ...boxData,
        id: boxId,
        code: code
      });

      // ============================================
      // FALL 1: Pool (nicht zugewiesen)
      // ============================================
      if (!objectId) {
        setBoxLoading(false);
        navigate(`/qr/assign-object/${code}?box_id=${boxId}`);
        return;
      }

      // ============================================
      // FALL 2: Auf LAGEPLAN platziert
      // → BoxScanDialog öffnen (kein GPS-Check)
      // ============================================
      if (positionType === 'floorplan' && hasFloorplanPosition) {
        setBoxLoading(false);
        setShowScanDialog(true);
        return;
      }

      // ============================================
      // FALL 3: Mit GPS platziert
      // → Nur auf MOBILE: GPS-Distanz prüfen
      // → Auf DESKTOP: Direkt BoxScanDialog öffnen
      // Auch wenn position_type nicht gesetzt aber lat/lng vorhanden!
      // ============================================
      const isGPSBox = (positionType === 'gps' || positionType === 'map') || 
                       (hasGPS && !hasFloorplanPosition);
      
      if (isGPSBox && hasGPS) {
        console.log(`📍 GPS-Box erkannt: positionType=${positionType}, hasGPS=${hasGPS}, isMobile=${isMobile}`);
        
        if (isMobile) {
          // MOBILE: GPS-Distanz prüfen
          console.log("📍 Starte GPS-Distanz Check...");
          await checkGPSDistance(boxData);
        } else {
          // DESKTOP: Kein GPS-Check, direkt zum Dialog
          console.log("🖥️ Desktop erkannt - überspringe GPS-Check");
          setBoxLoading(false);
          setShowScanDialog(true);
        }
        return;
      }
      
      // Debug: Warum kein GPS-Check?
      if (!hasGPS) {
        console.log(`⚠️ Kein GPS-Check: hasGPS=${hasGPS}, lat=${boxData?.lat}, lng=${boxData?.lng}`);
      }
      if (!isGPSBox) {
        console.log(`⚠️ Keine GPS-Box: positionType=${positionType}, hasFloorplanPosition=${hasFloorplanPosition}`);
      }

      // ============================================
      // FALL 4: Zugewiesen aber NICHT platziert
      // → Platzierungsauswahl
      // ============================================
      await showPlacementOptions(boxId, objectId, boxData, code);

    } catch (err) {
      console.error("QR check error:", err);
      setError("Fehler beim Prüfen des QR-Codes");
      setBoxLoading(false);
      setProcessingCode(false); // Lock zurücksetzen!
      resetScanner();
    }
  };

  // ============================================
  // GPS-DISTANZ PRÜFEN
  // ============================================
  const checkGPSDistance = async (boxData) => {
    console.log("📍 checkGPSDistance gestartet für Box:", boxData.id);
    setGpsLoading(true);
    
    try {
      console.log("📍 Hole aktuelle GPS-Position...");
      const currentPos = await getCurrentPosition();
      console.log("📍 Aktuelle Position:", currentPos);
      setCurrentGPS(currentPos);

      const boxLat = parseFloat(boxData.lat);
      const boxLng = parseFloat(boxData.lng);
      console.log("📍 Box-Position:", { lat: boxLat, lng: boxLng });
      
      const distance = calculateDistance(
        currentPos.lat, currentPos.lng,
        boxLat, boxLng
      );

      console.log(`📍 Berechnete Distanz: ${Math.round(distance)}m`);
      setGpsDistance(Math.round(distance));
      setBoxLoading(false);
      setGpsLoading(false);

      // Wenn > 10m Abweichung → Warnung zeigen
      if (distance > 10) {
        console.log("⚠️ Distanz > 10m - zeige GPS-Warnung");
        setShowGPSWarning(true);
      } else {
        // Alles OK → BoxScanDialog öffnen
        console.log("✅ Distanz OK - öffne BoxScanDialog");
        setShowScanDialog(true);
      }

    } catch (err) {
      console.error("GPS error:", err);
      // GPS-Fehler → Trotzdem BoxScanDialog öffnen
      setBoxLoading(false);
      setGpsLoading(false);
      setShowScanDialog(true);
    }
  };

  // ============================================
  // PLATZIERUNGSOPTIONEN LADEN
  // ============================================
  const showPlacementOptions = async (boxId, objectId, boxData, code) => {
    try {
      // Lagepläne des Objekts laden
      const floorplanRes = await axios.get(`${API}/floorplans/object/${objectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const floorplans = floorplanRes.data || [];
      
      setObjectFloorplans(floorplans);
      setPendingPlacement({
        boxId,
        objectId,
        boxData,
        code
      });
      setBoxLoading(false);
      setShowPlacementChoice(true);

    } catch (err) {
      console.error("Floorplan load error:", err);
      setObjectFloorplans([]);
      setPendingPlacement({
        boxId,
        objectId,
        boxData,
        code
      });
      setBoxLoading(false);
      setShowPlacementChoice(true);
    }
  };

  // ============================================
  // HANDLER
  // ============================================
  
  // GPS-Position aktualisieren
  const handleUpdateGPSPosition = async () => {
    if (!currentBox || !currentGPS) return;

    setGpsLoading(true);

    try {
      await axios.put(`${API}/boxes/${currentBox.id}/position`, {
        lat: currentGPS.lat,
        lng: currentGPS.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Position aktualisiert → BoxScanDialog öffnen
      setCurrentBox(prev => ({
        ...prev,
        lat: currentGPS.lat,
        lng: currentGPS.lng
      }));
      
      setShowGPSWarning(false);
      setGpsLoading(false);
      setShowScanDialog(true);

    } catch (err) {
      console.error("Update GPS error:", err);
      setError("Position konnte nicht aktualisiert werden");
      setGpsLoading(false);
    }
  };

  // Trotzdem kontrollieren (ohne Position-Update)
  const handleIgnoreGPSWarning = () => {
    setShowGPSWarning(false);
    setShowScanDialog(true);
  };

  // Platzierungsauswahl: GPS
  const handleChooseGPS = async () => {
    if (!pendingPlacement) return;
    
    // isMobile ist global definiert
    
    if (isMobile) {
      // MOBILE: GPS automatisch holen und Box platzieren
      setGpsLoading(true);
      console.log("📍 GPS Platzierung gestartet für Box:", pendingPlacement.boxId);
      
      try {
        // GPS Position holen
        const position = await getCurrentPosition();
        console.log("📍 GPS Position erhalten:", position);
        
        // Box auf GPS platzieren - Versuche zuerst /position, dann /place-map
        let placeSuccess = false;
        
        try {
          // Versuch 1: PUT /boxes/:id/position
          await axios.put(`${API}/boxes/${pendingPlacement.boxId}/position`, {
            lat: position.lat,
            lng: position.lng,
            position_type: 'gps'
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          placeSuccess = true;
          console.log("✅ Box platziert via /position");
        } catch (posErr) {
          console.log("⚠️ /position failed, trying /place-map:", posErr.message);
          
          // Versuch 2: POST /boxes/:id/place-map
          try {
            await axios.post(`${API}/boxes/${pendingPlacement.boxId}/place-map`, {
              lat: position.lat,
              lng: position.lng,
              object_id: pendingPlacement.objectId
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            placeSuccess = true;
            console.log("✅ Box platziert via /place-map");
          } catch (mapErr) {
            console.error("❌ Beide Endpunkte fehlgeschlagen:", mapErr);
            throw mapErr;
          }
        }
        
        if (!placeSuccess) {
          throw new Error("GPS konnte nicht gespeichert werden");
        }
        
        // Box-Daten aktualisieren für Dialog
        setCurrentBox({
          ...pendingPlacement.boxData,
          id: pendingPlacement.boxId,
          object_id: pendingPlacement.objectId,
          lat: position.lat,
          lng: position.lng,
          position_type: 'gps',
          qr_code: pendingPlacement.code
        });
        
        setGpsLoading(false);
        setShowPlacementChoice(false);
        
        // Prüfen ob Ersteinrichtung nötig
        const needsSetup = !pendingPlacement.boxData?.box_type_id;
        console.log("📦 needsSetup:", needsSetup, "box_type_id:", pendingPlacement.boxData?.box_type_id);
        
        if (needsSetup) {
          // Ersteinrichtung öffnen
          setShowFirstSetup(true);
        } else {
          // Scan-Dialog öffnen
          setShowScanDialog(true);
        }
        
      } catch (err) {
        console.error("❌ GPS placement error:", err);
        setGpsLoading(false);
        setError("GPS-Platzierung fehlgeschlagen: " + (err.message || err));
        
        // Nach 3s zur Maps navigieren als Fallback
        setTimeout(() => {
          navigate(`/maps?object_id=${pendingPlacement.objectId}&openBox=${pendingPlacement.boxId}&firstSetup=true`);
        }, 3000);
      }
    } else {
      // DESKTOP: Zur Maps navigieren (User klickt auf Karte)
      navigate(`/maps?object_id=${pendingPlacement.objectId}&openBox=${pendingPlacement.boxId}&firstSetup=true`);
    }
  };

  // Platzierungsauswahl: Lageplan
  const handleChooseFloorplan = () => {
    if (!pendingPlacement) return;
    
    if (objectFloorplans.length === 1) {
      // Nur 1 Lageplan → direkt dahin
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&openBox=${pendingPlacement.boxId}&place=true`);
    } else {
      // Mehrere Lagepläne → User muss wählen (in ObjectDetail)
      navigate(`/objects/${pendingPlacement.objectId}?tab=floorplan&openBox=${pendingPlacement.boxId}&place=true`);
    }
  };

  // Scan abgeschlossen → Scanner wieder aktivieren
  const handleScanCompleted = () => {
    console.log("✅ handleScanCompleted - Kontrolle gespeichert");
    setShowScanDialog(false);
    setProcessingCode(false);
    showSuccessToast("✓ Kontrolle gespeichert");
    // Temporär selben Code kurz blockieren (verhindert sofortiges Re-Open)
    try {
      const lastCode = currentBox?.code || scannedCode;
      if (lastCode) {
        tempBlockedCodeRef.current = lastCode;
        if (tempBlockedTimerRef.current) clearTimeout(tempBlockedTimerRef.current);
        tempBlockedTimerRef.current = setTimeout(() => { tempBlockedCodeRef.current = null; }, SHORT_BLOCK_MS);
      }
    } catch (e) { /* ignore */ }

    // Refresh the scanner once after short delay so UI has time to update
    setTimeout(() => {
      refreshScannerOnce();
    }, 100);
  };

  // ScanDialog schließen ohne Speichern
  const handleScanDialogClose = () => {
    console.log("❌ handleScanDialogClose - Dialog geschlossen ohne Speichern");
    setShowScanDialog(false);
    setProcessingCode(false);
    
    // Reset mit kleinem Delay
    setTimeout(() => {
      resetScanner();
    }, 100);
  };

  // Ersteinrichtung abgeschlossen → Scan-Dialog öffnen
  const handleFirstSetupCompleted = () => {
    console.log("✅ handleFirstSetupCompleted - Box eingerichtet");
    setShowFirstSetup(false);
    showSuccessToast("✓ Box eingerichtet");
    
    // Temporär selben Code kurz blockieren (verhindert sofortiges Re-Open)
    try {
      const lastCode = currentBox?.code || scannedCode;
      if (lastCode) {
        tempBlockedCodeRef.current = lastCode;
        if (tempBlockedTimerRef.current) clearTimeout(tempBlockedTimerRef.current);
        tempBlockedTimerRef.current = setTimeout(() => { tempBlockedCodeRef.current = null; }, SHORT_BLOCK_MS);
      }
    } catch (e) { /* ignore */ }

    // Jetzt Scan-Dialog für erste Kontrolle öffnen — restart scanner first
    setTimeout(async () => {
      await refreshScannerOnce();
      setShowScanDialog(true);
    }, 100);
  };

  // Ersteinrichtung schließen ohne Speichern
  const handleFirstSetupClose = () => {
    console.log("❌ handleFirstSetupClose - Ersteinrichtung abgebrochen");
    setShowFirstSetup(false);
    setProcessingCode(false);
    
    // Reset mit kleinem Delay
    setTimeout(() => {
      resetScanner();
    }, 100);
  };

  // Success Toast anzeigen
  const showSuccessToast = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  // Scanner zurücksetzen und neu starten
  const resetScanner = async () => {
    console.log("🔄 resetScanner called");
    
    // States zurücksetzen
    setScannedCode(null);
    setCurrentBox(null);
    setGpsDistance(0);
    setCurrentGPS(null);
    setShowGPSWarning(false);
    setShowPlacementChoice(false);
    setShowScanDialog(false);
    setShowFirstSetup(false);
    setPendingPlacement(null);
    setError("");
    setProcessingCode(false); // Lock zurücksetzen!
    
    // WICHTIG: Erst Scanner komplett stoppen
    await stopScanner(false);
    
    // Dann nach Delay neu starten
    setTimeout(async () => {
      if (currentCamera) {
        console.log("🎥 Scanner neu starten...");
        await startScanner(currentCamera.id);
      } else {
        console.error("❌ Keine Kamera verfügbar");
        initScanner();
      }
    }, 300);
  };

  // Einmaliger Refresh: Scanner kurz stoppen und wieder starten, ohne alle Zustände zurückzusetzen
  const refreshScannerOnce = async () => {
    try {
      console.log("🔁 refreshScannerOnce - restart video stream");
      // Vollständig stoppen und clear() aufrufen, damit die Instanz
      // neu erstellt wird — das ist robuster gegen stale detector states.
      await stopScanner(true);
      // Kleiner Delay damit die Kamera freigegeben wird
      await new Promise(r => setTimeout(r, 600));
      // Zusätzlich: Falls noch Video-Elemente existieren, stoppe deren Tracks explizit.
      try {
        const vids = document.querySelectorAll('video');
        vids.forEach(v => {
          try {
            const s = v.srcObject;
            if (s && typeof s.getTracks === 'function') {
              s.getTracks().forEach(t => {
                try { console.log('🛑 Stopping lingering track', t.kind, t.id); t.stop(); } catch (e) { /* ignore */ }
              });
            }
            try { v.srcObject = null; } catch (e) { /* ignore */ }
          } catch (e) { /* ignore */ }
        });
      } catch (e) {
        console.error('refreshScannerOnce: stop remaining tracks failed', e);
      }
      // Replace the DOM element to ensure Html5Qrcode mounts into a fresh node.
      try {
        const oldEl = document.getElementById('qr-reader');
        if (oldEl && oldEl.parentNode) {
          const parent = oldEl.parentNode;
          const newEl = document.createElement('div');
          newEl.id = 'qr-reader';
          newEl.className = oldEl.className || 'w-full';
          parent.replaceChild(newEl, oldEl);
          // update ref used by React (best-effort)
          try { scannerRef.current = newEl; } catch (e) { /* ignore */ }
        }
      } catch (domErr) {
        console.error('refreshScannerOnce: DOM replace failed', domErr);
      }

      if (currentCamera) {
        // recreate instance via startScanner
        await startScanner(currentCamera.id);
      } else {
        // fallback: re-init (may request cameras)
        await initScanner();
      }
      // Aufräumen lokaler Scan-Zustände damit neuer Scan möglich ist
      setScannedCode(null);
      setProcessingCode(false);
    } catch (err) {
      console.error("refreshScannerOnce error:", err);
    }
  };
  
  // Manuelles Entsperren des letzten Codes (falls User wirklich nochmal scannen will)
  const unlockLastCode = () => {
    // previously allowed manual unblock — no-op now that blockade removed
  };

  // Kamera wechseln
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    
    const currentIndex = cameras.findIndex(c => c.id === currentCamera?.id);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    setCurrentCamera(nextCamera);
    await startScanner(nextCamera.id);
  };

  // Taschenlampe toggle
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }]
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.error("Torch toggle error:", e);
    }
  };

  // ============================================
  // RENDER: GPS WARNUNG
  // ============================================
  if (showGPSWarning && currentBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
          <button onClick={resetScanner} className="p-2 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-400" />
            Position prüfen
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-300">Position stimmt nicht überein</h3>
                <p className="text-yellow-200/80 text-sm mt-1">
                  Du bist <strong>{formatDistance(gpsDistance)}</strong> von der gespeicherten Position entfernt.
                </p>
              </div>
            </div>
          </div>

          {/* Box Info */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <Package size={24} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold">Box #{currentBox.number || currentBox.display_number || currentBox.id}</p>
                <p className="text-sm text-gray-400">{currentBox.qr_code || currentBox.code}</p>
              </div>
            </div>
            
            {currentBox.grid_position && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin size={14} />
                <span>Position: {currentBox.grid_position}</span>
              </div>
            )}
          </div>

          {/* Gründe */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-2">Mögliche Gründe:</p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Box wurde verschoben</li>
              <li>• GPS-Ungenauigkeit (Gebäude, Wetter)</li>
              <li>• Falsche Box gescannt</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleUpdateGPSPosition}
              disabled={gpsLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl p-4 flex items-center justify-center gap-3 font-semibold transition-all"
            >
              {gpsLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPin size={20} />
              )}
              Position aktualisieren
            </button>

            <button
              onClick={handleIgnoreGPSWarning}
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 text-white rounded-xl p-4 flex items-center justify-center gap-3 transition-all"
            >
              <ArrowRight size={20} />
              Trotzdem kontrollieren
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PLATZIERUNGSAUSWAHL
  // ============================================
  if (showPlacementChoice && pendingPlacement) {
    const hasFloorplans = objectFloorplans.length > 0;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
          <button onClick={resetScanner} className="p-2 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Package size={20} />
            Box platzieren
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Info */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500/30 rounded-lg flex items-center justify-center">
                <Package size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold">Box #{pendingPlacement.boxData?.number || pendingPlacement.boxId}</p>
                <p className="text-sm text-gray-400">{pendingPlacement.code}</p>
              </div>
            </div>
            <p className="text-indigo-300 text-sm">
              Diese Box ist zugewiesen, aber noch nicht platziert. Wo soll sie positioniert werden?
            </p>
          </div>

          {/* Auswahl */}
          <div className="space-y-3">
            {/* GPS Option */}
            <button
              onClick={handleChooseGPS}
              disabled={gpsLoading}
              className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-green-500/50 rounded-xl p-5 text-left transition-all disabled:opacity-70"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {gpsLoading ? (
                    <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Navigation size={28} className="text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-white">
                    {gpsLoading 
                      ? "GPS wird ermittelt..." 
                      : isMobile 
                        ? "GPS-Position" 
                        : "Karte öffnen"
                    }
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {gpsLoading 
                      ? "Box wird an deiner aktuellen Position platziert"
                      : isMobile
                        ? "Automatisch an deiner aktuellen GPS-Position platzieren"
                        : "Zur Karte navigieren und Position manuell wählen"
                    }
                  </p>
                </div>
              </div>
            </button>

            {/* Lageplan Option */}
            {hasFloorplans ? (
              <button
                onClick={handleChooseFloorplan}
                className="w-full bg-[#111] hover:bg-[#1a1a1a] border border-white/10 hover:border-blue-500/50 rounded-xl p-5 text-left transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers size={28} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white">Lageplan</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Auf einem Gebäudeplan platzieren mit Grid-Position.
                      Ideal für Innenbereiche.
                    </p>
                    <p className="text-xs text-blue-400 mt-2">
                      {objectFloorplans.length} Lageplan{objectFloorplans.length > 1 ? 'e' : ''} verfügbar
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full bg-[#111] border border-white/5 rounded-xl p-5 opacity-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Layers size={28} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-400">Lageplan</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Kein Lageplan für dieses Objekt vorhanden.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zurück */}
          <button
            onClick={resetScanner}
            className="w-full py-3 text-gray-400 hover:text-white text-sm"
          >
            ← Anderen Code scannen
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: BOX SCAN DIALOG
  // ============================================
  if (showScanDialog && currentBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <BoxScanDialog
          box={currentBox}
          onClose={handleScanDialogClose}
          onSave={handleScanCompleted}
          onScanCreated={handleScanCompleted}
          // Für Details-Button
          onShowDetails={() => {
            const isFloorplan = currentBox.position_type === 'floorplan' && currentBox.floor_plan_id;
            if (isFloorplan) {
              navigate(`/objects/${currentBox.object_id}?tab=floorplan&openBox=${currentBox.id}`);
            } else {
              navigate(`/maps?object_id=${currentBox.object_id}&openBox=${currentBox.id}&flyTo=true`);
            }
          }}
        />
      </div>
    );
  }

  // ============================================
  // RENDER: ERSTEINRICHTUNG (BoxEditDialog)
  // ============================================
  if (showFirstSetup && currentBox) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <BoxEditDialog
          box={currentBox}
          boxTypes={boxTypes}
          isFirstSetup={true}
          onClose={handleFirstSetupClose}
          onSave={handleFirstSetupCompleted}
        />
      </div>
    );
  }

  // ============================================
  // RENDER: SCANNER
  // ============================================
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#111] border-b border-white/10">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Camera size={20} />
          QR-Scanner
        </h1>
        <div className="flex gap-2">
          {cameras.length > 1 && (
            <button onClick={switchCamera} className="p-2 text-gray-400 hover:text-white" title="Kamera wechseln">
              <SwitchCamera size={20} />
            </button>
          )}
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-2 ${torchOn ? "text-yellow-400" : "text-gray-400"} hover:text-white`}
              title="Taschenlampe"
            >
              <Flashlight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-4 bg-red-900/50 border border-red-500/50 rounded-xl">
          <p className="text-red-300 mb-3">{error}</p>
          {permissionState === "denied" && (
            <div className="text-sm text-gray-400 space-y-2">
              <p>So aktivierst du die Kamera:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tippe auf das 🔒 in der Adressleiste</li>
                <li>Wähle "Website-Einstellungen"</li>
                <li>Erlaube "Kamera"</li>
              </ul>
            </div>
          )}
          <button
            onClick={initScanner}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Loading */}
      {(permissionState === "checking" || boxLoading) && !error && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
          <p className="text-gray-400">
            {boxLoading ? "Box wird geladen..." : "Kamera wird aktiviert..."}
          </p>
        </div>
      )}

      {/* Scanner */}
      <div className="relative">
        <div 
          id="qr-reader" 
          ref={scannerRef}
          className="w-full"
          style={{ 
            display: permissionState === "granted" && !boxLoading ? "block" : "none",
          }}
        />
        
            {/* no persistent blocked-code banner (we rely on processing lock) */}

        {/* Custom Overlay */}
        {isScanning && !scannedCode && !boxLoading && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-64 h-64">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {isScanning && !scannedCode && !error && !boxLoading && (
        <p className="text-center text-gray-500 text-sm py-4">
          Halte den QR-Code in den grünen Rahmen
        </p>
      )}

      {/* Styles */}
      <style>{`
        #qr-reader {
          border: none !important;
          background: #0a0a0a !important;
        }
        #qr-reader video {
          border-radius: 0 !important;
        }
        #qr-reader__scan_region {
          background: transparent !important;
        }
        #qr-reader__dashboard,
        #qr-reader__dashboard_section_csr,
        #qr-reader__dashboard_section_swaplink,
        #qr-reader__header_message {
          display: none !important;
        }
        @keyframes scan {
          0%, 100% { top: 0; opacity: 0; }
          50% { top: calc(100% - 2px); opacity: 1; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );

}
