/* ============================================================
   TRAPMAP – PUBLIC SCAN REDIRECT PAGE
   URL: /s/:code
   
   Diese Seite wird aufgerufen wenn jemand einen QR-Code scannt.
   Sie prüft den Login-Status und leitet entsprechend weiter.
   ============================================================ */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { QrCode, LogIn, Package, Loader, AlertCircle, CheckCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function PublicScan() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [status, setStatus] = useState("checking"); // checking | login | redirecting | error
  const [message, setMessage] = useState("Code wird geprüft...");
  const [boxInfo, setBoxInfo] = useState(null);

  // Auth prüfen
  const token = localStorage.getItem("trapmap_token");
  const user = JSON.parse(localStorage.getItem("trapmap_user") || "null");
  const isLoggedIn = token && user;

  useEffect(() => {
    handleScan();
  }, [code]);

  const handleScan = async () => {
    if (!code) {
      setStatus("error");
      setMessage("Kein Code angegeben");
      return;
    }

    // Nicht eingeloggt?
    if (!isLoggedIn) {
      setStatus("login");
      setMessage("Bitte anmelden um fortzufahren");
      // Code für nach dem Login speichern
      sessionStorage.setItem("trapmap_pending_scan", code);
      return;
    }

    // Code prüfen
    setStatus("checking");
    setMessage("Code wird geprüft...");

    try {
      const res = await fetch(`${API}/qr/check/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Code konnte nicht geprüft werden");
      }

      const data = await res.json();

      // Kurze Pause für bessere UX
      await new Promise(r => setTimeout(r, 800));

      if (data.assigned && data.box_id) {
        // ✅ Code ist bereits einer Box zugewiesen
        // → Direkt zur Kontrolle/Scan-Seite
        setStatus("redirecting");
        setMessage("Box gefunden! Weiterleitung...");
        setBoxInfo({ id: data.box_id, assigned: true });

        setTimeout(() => {
          // Zur Kontrolle-Seite mit dem Box-Kontext
          navigate(`/scan/control/${data.box_id}`, { 
            state: { 
              fromQR: true, 
              code: code 
            },
            replace: true 
          });
        }, 500);

      } else {
        // 🆕 Code ist NEU (nicht zugewiesen)
        // → Zur Setup-Seite (Box anlegen)
        setStatus("redirecting");
        setMessage("Neuer Code! Weiterleitung zur Einrichtung...");
        setBoxInfo({ assigned: false });

        setTimeout(() => {
          navigate(`/scan/setup`, { 
            state: { 
              code: code,
              fromQR: true 
            },
            replace: true 
          });
        }, 500);
      }

    } catch (err) {
      console.error("Scan error:", err);
      setStatus("error");
      setMessage(err.message || "Verbindungsfehler");
    }
  };

  const handleLogin = () => {
    // Code merken
    sessionStorage.setItem("trapmap_pending_scan", code);
    // Zum Login mit Return-URL
    navigate("/login", { 
      state: { returnTo: `/s/${code}` } 
    });
  };

  const handleRetry = () => {
    setStatus("checking");
    handleScan();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Logo */}
        <div style={styles.logo}>
          <QrCode size={40} color="#6366f1" />
          <span>TrapMap</span>
        </div>

        {/* Code Display */}
        <div style={styles.codeBox}>
          <small>Gescannter Code</small>
          <strong>{code || "—"}</strong>
        </div>

        {/* Status: Checking */}
        {status === "checking" && (
          <div style={styles.statusBox}>
            <Loader size={48} style={styles.spinner} />
            <p>{message}</p>
          </div>
        )}

        {/* Status: Login Required */}
        {status === "login" && (
          <div style={styles.statusBox}>
            <LogIn size={48} color="#60a5fa" />
            <h2>Anmeldung erforderlich</h2>
            <p>{message}</p>
            
            <button style={styles.primaryButton} onClick={handleLogin}>
              <LogIn size={20} />
              Jetzt anmelden
            </button>

            <p style={styles.hint}>
              Nach der Anmeldung wirst du automatisch weitergeleitet.
            </p>
          </div>
        )}

        {/* Status: Redirecting */}
        {status === "redirecting" && (
          <div style={styles.statusBox}>
            {boxInfo?.assigned ? (
              <Package size={48} color="#10b981" />
            ) : (
              <CheckCircle size={48} color="#6366f1" />
            )}
            <h2>{boxInfo?.assigned ? "Box gefunden!" : "Neuer Code"}</h2>
            <p>{message}</p>
            <Loader size={24} style={styles.spinnerSmall} />
          </div>
        )}

        {/* Status: Error */}
        {status === "error" && (
          <div style={styles.statusBox}>
            <AlertCircle size={48} color="#ef4444" />
            <h2>Fehler</h2>
            <p>{message}</p>
            
            <button style={styles.secondaryButton} onClick={handleRetry}>
              Erneut versuchen
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={styles.footer}>
        TrapMap Schädlingsmonitoring<br />
        <a href="https://trap-map.de" style={styles.link}>trap-map.de</a>
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    background: "#1e293b",
    borderRadius: "24px",
    padding: "40px 32px",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    border: "1px solid #334155"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    fontSize: "28px",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "32px"
  },
  codeBox: {
    background: "#0f172a",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "32px"
  },
  statusBox: {
    color: "#fff"
  },
  spinner: {
    color: "#6366f1",
    animation: "spin 1s linear infinite",
    marginBottom: "16px"
  },
  spinnerSmall: {
    color: "#6366f1",
    animation: "spin 1s linear infinite",
    marginTop: "16px"
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "16px 24px",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "24px"
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 24px",
    background: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "24px"
  },
  hint: {
    color: "#6b7280",
    fontSize: "13px",
    marginTop: "16px"
  },
  footer: {
    marginTop: "32px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "13px"
  },
  link: {
    color: "#6366f1",
    textDecoration: "none"
  }
};

// CSS Animation für Spinner (in index.css einfügen)
const spinnerKeyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;