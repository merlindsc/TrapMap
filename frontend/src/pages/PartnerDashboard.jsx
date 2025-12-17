/* ============================================================
   TRAPMAP – PARTNER DASHBOARD
   Übersicht für externe Partner/Kunden
   
   Features:
   - Passwort-Ändern Dialog beim ersten Login
   - QR-Scanner Integration (mit @zxing/browser)
   - Objekt/Box-Übersicht
   - Scan durchführen
   ============================================================ */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode, Building2, Package, Scan, LogOut, RefreshCw,
  Loader, AlertCircle, CheckCircle, Clock, MapPin,
  ChevronRight, Camera, X, Eye, EyeOff, Lock, Save
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import trapMapLogo from "../assets/trapmap-logo-200.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("trapmap_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Partner-Daten aus localStorage
  const [partnerData, setPartnerData] = useState(
    JSON.parse(localStorage.getItem("trapmap_partner") || "{}")
  );

  // State
  const [loading, setLoading] = useState(true);
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Passwort-Ändern Dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Scanner Dialog
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scannedBox, setScannedBox] = useState(null);
  const [scanStatus, setScanStatus] = useState("ok");
  const [scanNotes, setScanNotes] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  
  // ZXing Scanner Refs
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // ============================================
  // INITIALE DATEN LADEN
  // ============================================
  useEffect(() => {
    // Prüfe ob Passwort geändert werden muss
    if (partnerData.must_change_password) {
      setShowPasswordDialog(true);
    }
    loadObjects();
  }, []);

  const loadObjects = async () => {
    if (loggingOut) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/partners/my-objects`, { headers });
      
      if (!res.ok) {
        if (res.status === 401) {
          setLoggingOut(true);
          localStorage.removeItem("trapmap_token");
          localStorage.removeItem("trapmap_user_type");
          localStorage.removeItem("trapmap_partner");
          window.location.href = "/partner/login";
          return;
        }
        throw new Error("Fehler beim Laden");
      }

      const data = await res.json();
      setObjects(Array.isArray(data) ? data : []);

      if (data.length > 0) {
        setSelectedObject(data[0]);
        loadBoxes(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBoxes = async (objectId) => {
    try {
      const res = await fetch(`${API}/partners/my-boxes?object_id=${objectId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBoxes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Load boxes error:", err);
    }
  };

  // ============================================
  // OBJEKT WECHSELN
  // ============================================
  const selectObject = (obj) => {
    setSelectedObject(obj);
    loadBoxes(obj.id);
  };

  // ============================================
  // LOGOUT
  // ============================================
  const handleLogout = () => {
    setLoggingOut(true);
    localStorage.removeItem("trapmap_token");
    localStorage.removeItem("trapmap_user_type");
    localStorage.removeItem("trapmap_partner");
    window.location.href = "/partner/login";
  };

  // ============================================
  // PASSWORT ÄNDERN
  // ============================================
  const handleChangePassword = async () => {
    setPasswordError(null);
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwörter stimmen nicht überein");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Passwort muss mindestens 6 Zeichen haben");
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const res = await fetch(`${API}/partners/change-password`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Ändern");
      }
      
      // Erfolg - Dialog schließen und Partner-Daten updaten
      const updatedPartner = { ...partnerData, must_change_password: false };
      setPartnerData(updatedPartner);
      localStorage.setItem("trapmap_partner", JSON.stringify(updatedPartner));
      
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ============================================
  // QR SCANNER MIT ZXING
  // ============================================
  useEffect(() => {
    if (showScanner && !scanResult) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [showScanner, scanResult]);

  const startScanner = async () => {
    try {
      // Warten bis Video-Element bereit ist
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) return;
      
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Kameras auflisten
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (devices.length === 0) {
        console.error("Keine Kamera gefunden");
        return;
      }
      
      // Bevorzuge Rückkamera
      let deviceId = devices[devices.length - 1].deviceId;
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("environment")
      );
      if (backCamera) deviceId = backCamera.deviceId;
      
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            onScanSuccess(result.getText());
          }
        }
      );
      
    } catch (err) {
      console.error("Scanner init error:", err);
    }
  };

  const stopScanner = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {}
      codeReaderRef.current = null;
    }
  };

  const onScanSuccess = (decodedText) => {
    // Scanner stoppen
    stopScanner();
    
    setScanResult(decodedText);
    
    // QR-Code parsen (Format: TRAPMAP:BOX:123 oder nur die ID)
    let boxId = decodedText;
    if (decodedText.includes(":")) {
      const parts = decodedText.split(":");
      boxId = parts[parts.length - 1];
    }
    
    // Box in der Liste finden
    const foundBox = boxes.find(b => 
      b.id.toString() === boxId || 
      b.qr_code === decodedText ||
      b.qr_code === boxId
    );
    
    if (foundBox) {
      setScannedBox(foundBox);
    } else {
      setScannedBox({ id: boxId, name: `Box ${boxId}`, unknown: true });
    }
  };

  const closeScanner = () => {
    stopScanner();
    setShowScanner(false);
    setScanResult(null);
    setScannedBox(null);
    setScanStatus("ok");
    setScanNotes("");
  };

  const submitScan = async () => {
    if (!scannedBox) return;
    
    setScanLoading(true);
    
    try {
      const res = await fetch(`${API}/partners/scan`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          box_id: scannedBox.id,
          status: scanStatus,
          notes: scanNotes
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan fehlgeschlagen");
      }
      
      // Erfolg
      alert("✅ Scan erfolgreich gespeichert!");
      closeScanner();
      
      // Boxen neu laden
      if (selectedObject) {
        loadBoxes(selectedObject.id);
      }
      
    } catch (err) {
      alert("❌ Fehler: " + err.message);
    } finally {
      setScanLoading(false);
    }
  };

  // ============================================
  // STATUS BADGE
  // ============================================
  const getStatusBadge = (status) => {
    const statusConfig = {
      ok: { color: "#22c55e", bg: "#dcfce7", label: "OK" },
      warning: { color: "#f59e0b", bg: "#fef3c7", label: "Warnung" },
      critical: { color: "#ef4444", bg: "#fee2e2", label: "Kritisch" },
      pending: { color: "#6366f1", bg: "#e0e7ff", label: "Ausstehend" }
    };
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        color: config.color,
        background: config.bg
      }}>
        {status === "ok" && <CheckCircle size={12} />}
        {status === "warning" && <AlertCircle size={12} />}
        {status === "critical" && <AlertCircle size={12} />}
        {status === "pending" && <Clock size={12} />}
        {config.label}
      </span>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  
  if (loggingOut) {
    return (
      <div style={styles.loadingContainer}>
        <Loader size={40} style={styles.spinner} />
        <p>Abmelden...</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader size={40} style={styles.spinner} />
        <p>Lade Ihre Objekte...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ============================================ */}
      {/* HEADER MIT LOGO */}
      {/* ============================================ */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img src={trapMapLogo} alt="TrapMap" style={styles.headerLogo} />
          <div>
            <p style={styles.subtitle}>Partner-Portal</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{partnerData.name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ============================================ */}
      {/* HAUPTBEREICH */}
      {/* ============================================ */}
      <main style={styles.main}>
        {/* Scan Button */}
        <button onClick={() => setShowScanner(true)} style={styles.scanButton}>
          <Camera size={24} />
          <span>QR-Code scannen</span>
        </button>

        {/* Objekt-Auswahl */}
        {objects.length > 1 && (
          <div style={styles.objectTabs}>
            {objects.map(obj => (
              <button
                key={obj.id}
                onClick={() => selectObject(obj)}
                style={{
                  ...styles.objectTab,
                  ...(selectedObject?.id === obj.id ? styles.objectTabActive : {})
                }}
              >
                <Building2 size={16} />
                {obj.name}
              </button>
            ))}
          </div>
        )}

        {/* Aktuelles Objekt Info */}
        {selectedObject && (
          <div style={styles.objectCard}>
            <div style={styles.objectHeader}>
              <Building2 size={24} color="#6366f1" />
              <div>
                <h2 style={styles.objectName}>{selectedObject.name}</h2>
                <p style={styles.objectAddress}>
                  <MapPin size={14} />
                  {selectedObject.address}, {selectedObject.postal_code} {selectedObject.city}
                </p>
              </div>
            </div>
            <div style={styles.objectStats}>
              <div style={styles.stat}>
                <span style={styles.statValue}>{boxes.length}</span>
                <span style={styles.statLabel}>Boxen</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>
                  {boxes.filter(b => b.status === "ok").length}
                </span>
                <span style={styles.statLabel}>OK</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statValue}>
                  {boxes.filter(b => ["warning", "critical"].includes(b.status)).length}
                </span>
                <span style={styles.statLabel}>Auffällig</span>
              </div>
            </div>
          </div>
        )}

        {/* Boxen-Liste */}
        <div style={styles.boxList}>
          <h3 style={styles.sectionTitle}>
            <Package size={18} />
            Monitoring-Boxen
          </h3>
          
          {boxes.length === 0 ? (
            <p style={styles.emptyText}>Keine Boxen gefunden</p>
          ) : (
            boxes.map(box => (
              <div key={box.id} style={styles.boxCard}>
                <div style={styles.boxMain}>
                  <div style={styles.boxIcon}>
                    <Package size={20} color="#6366f1" />
                  </div>
                  <div style={styles.boxInfo}>
                    <h4 style={styles.boxName}>{box.name}</h4>
                    <p style={styles.boxMeta}>
                      {box.room && `${box.room}`}
                      {box.floor && ` • Etage ${box.floor}`}
                    </p>
                  </div>
                  {getStatusBadge(box.status)}
                </div>
                {box.last_scan && (
                  <p style={styles.boxLastScan}>
                    <Clock size={12} />
                    Letzter Scan: {new Date(box.last_scan).toLocaleDateString("de-DE")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Refresh Button */}
        <button onClick={loadObjects} style={styles.refreshBtn}>
          <RefreshCw size={16} />
          Aktualisieren
        </button>
      </main>

      {/* ============================================ */}
      {/* PASSWORT ÄNDERN DIALOG */}
      {/* ============================================ */}
      {showPasswordDialog && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <div style={styles.dialogHeader}>
              <Lock size={24} color="#6366f1" />
              <h2>Passwort ändern</h2>
            </div>
            
            <p style={styles.dialogText}>
              {partnerData.must_change_password 
                ? "Bitte ändern Sie Ihr Passwort für mehr Sicherheit."
                : "Geben Sie Ihr aktuelles und neues Passwort ein."
              }
            </p>
            
            {passwordError && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} />
                {passwordError}
              </div>
            )}
            
            <div style={styles.inputGroup}>
              <label>Aktuelles Passwort</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={styles.input}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  style={styles.eyeBtn}
                >
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div style={styles.inputGroup}>
              <label>Neues Passwort</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Mindestens 6 Zeichen"
                />
                <button 
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={styles.eyeBtn}
                >
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div style={styles.inputGroup}>
              <label>Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                placeholder="Passwort wiederholen"
              />
            </div>
            
            <div style={styles.dialogActions}>
              {!partnerData.must_change_password && (
                <button 
                  onClick={() => setShowPasswordDialog(false)}
                  style={styles.cancelBtn}
                >
                  Abbrechen
                </button>
              )}
              <button 
                onClick={handleChangePassword}
                disabled={passwordLoading}
                style={styles.saveBtn}
              >
                {passwordLoading ? <Loader size={18} style={styles.spinner} /> : <Save size={18} />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SCANNER DIALOG MIT ZXING */}
      {/* ============================================ */}
      {showScanner && (
        <div style={styles.overlay}>
          <div style={styles.scannerDialog}>
            <div style={styles.scannerHeader}>
              <h2>QR-Code scannen</h2>
              <button onClick={closeScanner} style={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>
            
            {!scanResult ? (
              <div style={styles.scannerArea}>
                <video 
                  ref={videoRef} 
                  style={{ width: "100%", borderRadius: 8, background: "#000" }}
                />
                <p style={{ textAlign: "center", color: "#94a3b8", marginTop: 12, fontSize: 14 }}>
                  Halte den QR-Code vor die Kamera
                </p>
              </div>
            ) : (
              <div style={styles.scanResultArea}>
                {scannedBox?.unknown ? (
                  <div style={styles.warningBox}>
                    <AlertCircle size={20} />
                    <p>Box nicht in Ihren zugewiesenen Objekten gefunden.</p>
                  </div>
                ) : (
                  <>
                    <div style={styles.scannedBoxInfo}>
                      <CheckCircle size={24} color="#22c55e" />
                      <div>
                        <h3>{scannedBox?.name}</h3>
                        <p>Box erkannt</p>
                      </div>
                    </div>
                    
                    <div style={styles.inputGroup}>
                      <label>Status</label>
                      <select 
                        value={scanStatus} 
                        onChange={(e) => setScanStatus(e.target.value)}
                        style={styles.select}
                      >
                        <option value="ok">✅ OK - Keine Auffälligkeiten</option>
                        <option value="warning">⚠️ Warnung - Befall festgestellt</option>
                        <option value="critical">🚨 Kritisch - Sofortmaßnahmen nötig</option>
                      </select>
                    </div>
                    
                    <div style={styles.inputGroup}>
                      <label>Notizen (optional)</label>
                      <textarea
                        value={scanNotes}
                        onChange={(e) => setScanNotes(e.target.value)}
                        style={styles.textarea}
                        placeholder="Bemerkungen zum Scan..."
                        rows={3}
                      />
                    </div>
                    
                    <button 
                      onClick={submitScan}
                      disabled={scanLoading}
                      style={styles.submitScanBtn}
                    >
                      {scanLoading ? <Loader size={18} style={styles.spinner} /> : <Scan size={18} />}
                      Scan speichern
                    </button>
                  </>
                )}
                
                <button onClick={closeScanner} style={styles.cancelBtn}>
                  {scannedBox?.unknown ? "Schließen" : "Abbrechen"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f8fafc"
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
    color: "#f8fafc",
    gap: 16
  },
  spinner: {
    animation: "spin 1s linear infinite"
  },
  
  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    background: "#1e293b",
    borderBottom: "1px solid #334155"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  headerLogo: {
    height: 44,
    width: "auto",
    filter: "brightness(1.1) contrast(1.1) saturate(1.1)",
    imageRendering: "-webkit-optimize-contrast",
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden"
  },
  subtitle: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  userName: {
    fontSize: 14,
    color: "#cbd5e1"
  },
  logoutBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: 8
  },
  
  // Main
  main: {
    padding: 20,
    maxWidth: 600,
    margin: "0 auto"
  },
  
  // Scan Button
  scanButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 20
  },
  
  // Object Tabs
  objectTabs: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    overflowX: "auto"
  },
  objectTab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  objectTabActive: {
    background: "#6366f1",
    borderColor: "#6366f1",
    color: "white"
  },
  
  // Object Card
  objectCard: {
    background: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  objectHeader: {
    display: "flex",
    gap: 12,
    marginBottom: 16
  },
  objectName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600
  },
  objectAddress: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  objectStats: {
    display: "flex",
    gap: 16
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#6366f1"
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8"
  },
  
  // Box List
  boxList: {
    marginBottom: 20
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 12
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    padding: 20
  },
  boxCard: {
    background: "#1e293b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8
  },
  boxMain: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  boxIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  boxInfo: {
    flex: 1
  },
  boxName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600
  },
  boxMeta: {
    margin: "2px 0 0",
    fontSize: 12,
    color: "#64748b"
  },
  boxLastScan: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#64748b",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #334155"
  },
  
  // Refresh Button
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: 12,
    background: "#334155",
    color: "#cbd5e1",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },
  
  // Dialog Overlay
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000
  },
  dialog: {
    background: "#1e293b",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400
  },
  dialogHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },
  dialogText: {
    color: "#94a3b8",
    marginBottom: 20
  },
  
  // Form Elements
  inputGroup: {
    marginBottom: 16
  },
  inputWrapper: {
    position: "relative"
  },
  input: {
    width: "100%",
    padding: "12px 40px 12px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f8fafc",
    fontSize: 14,
    boxSizing: "border-box"
  },
  select: {
    width: "100%",
    padding: 12,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f8fafc",
    fontSize: 14
  },
  textarea: {
    width: "100%",
    padding: 12,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f8fafc",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box"
  },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer"
  },
  
  // Buttons
  dialogActions: {
    display: "flex",
    gap: 12,
    marginTop: 20
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    background: "#334155",
    color: "#cbd5e1",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    background: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  
  // Error Box
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 8,
    marginBottom: 16
  },
  warningBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 8,
    marginBottom: 16
  },
  
  // Scanner Dialog
  scannerDialog: {
    background: "#1e293b",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90vh",
    overflow: "auto"
  },
  scannerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottom: "1px solid #334155"
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer"
  },
  scannerArea: {
    padding: 16
  },
  scanResultArea: {
    padding: 16
  },
  scannedBoxInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    background: "#dcfce7",
    borderRadius: 8,
    marginBottom: 16,
    color: "#166534"
  },
  submitScanBtn: {
    width: "100%",
    padding: 14,
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12
  }
};