/* ============================================================
   TRAPMAP - COOKIE CONSENT BANNER
   DSGVO-konform mit Opt-In
   ============================================================ */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, X, Check, Settings } from "lucide-react";
import "./CookieConsent.css";

const COOKIE_CONSENT_KEY = "trapmap_cookie_consent";
const COOKIE_SETTINGS_KEY = "trapmap_cookie_settings";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    necessary: true, // immer an, nicht änderbar
    functional: false,
    analytics: false,
  });

  useEffect(() => {
    // Prüfen ob bereits Consent gegeben wurde
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Kurze Verzögerung für bessere UX
      setTimeout(() => setVisible(true), 1000);
    } else {
      // Gespeicherte Settings laden
      const savedSettings = localStorage.getItem(COOKIE_SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, []);

  const acceptAll = () => {
    const allSettings = {
      necessary: true,
      functional: true,
      analytics: true,
    };
    saveConsent(allSettings);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      functional: false,
      analytics: false,
    };
    saveConsent(necessaryOnly);
  };

  const saveSettings = () => {
    saveConsent(settings);
  };

  const saveConsent = (consentSettings) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_SETTINGS_KEY, JSON.stringify(consentSettings));
    setSettings(consentSettings);
    setVisible(false);
    setShowSettings(false);

    // Hier könnten Analytics etc. aktiviert werden
    if (consentSettings.analytics) {
      // enableAnalytics();
    }
  };

  if (!visible) return null;

  return (
    <div className="cookie-overlay">
      <div className="cookie-banner">
        <div className="cookie-header">
          <div className="cookie-icon">
            <Cookie size={24} />
          </div>
          <h3>Cookie-Einstellungen</h3>
        </div>

        {!showSettings ? (
          <>
            <div className="cookie-content">
              <p>
                Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu 
                bieten. Einige Cookies sind notwendig, damit die Website funktioniert. Andere 
                helfen uns, die Website zu verbessern.
              </p>
              <p>
                Weitere Informationen finden Sie in unserer{" "}
                <Link to="/datenschutz" className="cookie-link">
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </div>

            <div className="cookie-actions">
              <button className="cookie-btn secondary" onClick={acceptNecessary}>
                Nur Notwendige
              </button>
              <button className="cookie-btn secondary" onClick={() => setShowSettings(true)}>
                <Settings size={16} />
                Einstellungen
              </button>
              <button className="cookie-btn primary" onClick={acceptAll}>
                <Check size={16} />
                Alle akzeptieren
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-content">
              <p>
                Hier können Sie auswählen, welche Arten von Cookies Sie zulassen möchten.
              </p>

              <div className="cookie-options">
                <div className="cookie-option">
                  <div className="cookie-option-header">
                    <div className="cookie-option-info">
                      <strong>Notwendige Cookies</strong>
                      <span>Erforderlich für die Grundfunktionen der Website</span>
                    </div>
                    <div className="cookie-toggle disabled">
                      <input type="checkbox" checked={true} disabled />
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                  <p className="cookie-option-desc">
                    Diese Cookies sind für den Betrieb der Website unbedingt erforderlich. 
                    Dazu gehören z.B. Session-Cookies für die Anmeldung.
                  </p>
                </div>

                <div className="cookie-option">
                  <div className="cookie-option-header">
                    <div className="cookie-option-info">
                      <strong>Funktionale Cookies</strong>
                      <span>Für erweiterte Funktionen und Personalisierung</span>
                    </div>
                    <div className="cookie-toggle">
                      <input
                        type="checkbox"
                        checked={settings.functional}
                        onChange={(e) => setSettings({ ...settings, functional: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                  <p className="cookie-option-desc">
                    Diese Cookies ermöglichen erweiterte Funktionen wie das Speichern Ihrer 
                    Einstellungen (z.B. Theme, Sprache).
                  </p>
                </div>

                <div className="cookie-option">
                  <div className="cookie-option-header">
                    <div className="cookie-option-info">
                      <strong>Analyse Cookies</strong>
                      <span>Helfen uns, die Website zu verbessern</span>
                    </div>
                    <div className="cookie-toggle">
                      <input
                        type="checkbox"
                        checked={settings.analytics}
                        onChange={(e) => setSettings({ ...settings, analytics: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                  <p className="cookie-option-desc">
                    Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website 
                    interagieren. Alle Daten werden anonymisiert erhoben.
                  </p>
                </div>
              </div>
            </div>

            <div className="cookie-actions">
              <button className="cookie-btn secondary" onClick={() => setShowSettings(false)}>
                Zurück
              </button>
              <button className="cookie-btn primary" onClick={saveSettings}>
                <Check size={16} />
                Auswahl speichern
              </button>
            </div>
          </>
        )}

        <div className="cookie-footer">
          <Link to="/impressum">Impressum</Link>
          <span>•</span>
          <Link to="/datenschutz">Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HOOK: Cookie Consent prüfen
   ============================================================ */
export function useCookieConsent() {
  const [consent, setConsent] = useState({
    necessary: false,
    functional: false,
    analytics: false,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem(COOKIE_SETTINGS_KEY);
    if (savedSettings) {
      setConsent(JSON.parse(savedSettings));
    }
  }, []);

  return consent;
}

/* ============================================================
   Cookie Settings zurücksetzen (für Footer-Link)
   ============================================================ */
export function resetCookieConsent() {
  localStorage.removeItem(COOKIE_CONSENT_KEY);
  localStorage.removeItem(COOKIE_SETTINGS_KEY);
  window.location.reload();
}