/* ============================================================
   TRAPMAP – PARTNER LOGIN
   Login-Seite für externe Partner/Kunden
   ============================================================ */

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QrCode, Mail, Lock, LogIn, Loader, AlertCircle, Building2 } from "lucide-react";
import trapMapLogo from "../assets/trapmap-logo-200.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function PartnerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prüfe ob ein Pending Scan existiert
  let pendingScan = null;
  try {
    pendingScan = localStorage.getItem("trapmap_pending_scan");
  } catch (e) {
    console.warn("localStorage nicht verfügbar:", e);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/partners/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login fehlgeschlagen");
      }

      // Token speichern (mit Marker dass es ein Partner ist)
      try {
        localStorage.setItem("trapmap_token", data.token);
        localStorage.setItem("trapmap_user_type", "partner");
        localStorage.setItem("trapmap_partner", JSON.stringify(data.partner));
      } catch (e) {
        console.warn("Konnte Session nicht in localStorage speichern:", e);
      }

      // Redirect mit komplettem Reload (damit App.jsx den Partner-Check neu ausführt)
      if (pendingScan) {
        window.location.href = `/s/${pendingScan}`;
      } else {
        window.location.href = "/partner/dashboard";
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header mit Logo */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <img src={trapMapLogo} alt="TrapMap" style={styles.logo} />
          </div>
          <div style={styles.badge}>
            <Building2 size={16} />
            Partner-Zugang
          </div>
        </div>

        {/* Pending Scan Hinweis */}
        {pendingScan && (
          <div style={styles.infoBox}>
            <QrCode size={20} />
            <div>
              <strong>QR-Code gescannt</strong>
              <p>Melden Sie sich an, um die Kontrolle durchzuführen.</p>
              <code style={styles.codeSmall}>{pendingScan}</code>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Mail size={16} />
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Lock size={16} />
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={20} style={styles.spinner} />
                Wird angemeldet...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Anmelden
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <span>oder</span>
        </div>

        {/* Link zum normalen Login */}
        <button
          style={styles.secondaryButton}
          onClick={() => navigate("/login")}
        >
          Als Mitarbeiter anmelden
        </button>

        {/* Hilfe */}
        <p style={styles.helpText}>
          Sie haben Ihre Zugangsdaten noch nicht erhalten?
          <br />
          Kontaktieren Sie Ihren Schädlingsbekämpfer.
        </p>
      </div>

      {/* Footer */}
      <p style={styles.footer}>
        TrapMap – Professionelles Schädlingsmonitoring
      </p>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
    padding: "20px",
    color: "#fff"
  },
  card: {
    background: "#1f2937",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
  },
  header: {
    textAlign: "center",
    marginBottom: "24px"
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px"
  },
  logo: {
    height: "80px",
    width: "auto",
    filter: "brightness(1.1) contrast(1.1) saturate(1.1)",
    imageRendering: "-webkit-optimize-contrast",
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "#374151",
    borderRadius: "20px",
    fontSize: "13px",
    color: "#9ca3af"
  },
  infoBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px",
    background: "#1e3a5f",
    borderRadius: "8px",
    marginBottom: "20px",
    color: "#93c5fd",
    fontSize: "14px"
  },
  codeSmall: {
    display: "block",
    marginTop: "6px",
    fontSize: "12px",
    color: "#6366f1",
    fontFamily: "monospace"
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    background: "#7f1d1d",
    borderRadius: "8px",
    marginBottom: "20px",
    color: "#fca5a5",
    fontSize: "14px"
  },
  formGroup: {
    marginBottom: "16px"
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#9ca3af",
    marginBottom: "6px"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s"
  },
  submitButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "14px",
    background: "#6366f1",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px"
  },
  spinner: {
    animation: "spin 1s linear infinite"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "24px 0",
    color: "#6b7280",
    fontSize: "13px"
  },
  secondaryButton: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#9ca3af",
    fontSize: "14px",
    cursor: "pointer"
  },
  helpText: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 1.5
  },
  footer: {
    marginTop: "24px",
    fontSize: "12px",
    color: "#6b7280"
  }
};