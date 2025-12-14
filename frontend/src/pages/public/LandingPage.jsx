/* ============================================================
   TRAPMAP - LANDING PAGE (ECHTE INHALTE)
   Marketing Website für trap-map.de
   ============================================================ */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode, Shield, BarChart3, MapPin, Clock, FileCheck,
  Check, Menu, X, Camera, Settings, Users, Sliders,
  Phone, Mail, ArrowRight, Sparkles, Timer, HandshakeIcon
} from "lucide-react";
import "./LandingPage.css";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-page">
      {/* ============================================
          NAVIGATION
          ============================================ */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="brand-trap">Trap</span>
            <span className="brand-map">Map</span>
          </div>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#individuell">Für Profis</a>
            <a href="#preise">Preise</a>
            <a href="#kontakt">Kontakt</a>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="nav-login">Anmelden</Link>
            <a href="#testen" className="nav-cta">Kostenlos testen</a>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#individuell" onClick={() => setMobileMenuOpen(false)}>Für Profis</a>
            <a href="#preise" onClick={() => setMobileMenuOpen(false)}>Preise</a>
            <a href="#kontakt" onClick={() => setMobileMenuOpen(false)}>Kontakt</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Anmelden</Link>
            <a href="#testen" className="mobile-cta" onClick={() => setMobileMenuOpen(false)}>
              Kostenlos testen
            </a>
          </div>
        )}
      </nav>

      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            Bis 01.02.2026 kostenlos testen
          </div>
          
          <h1>
            Nie wieder Zettelwirtschaft
            <span className="gradient-text"> bei der Schädlingskontrolle.</span>
          </h1>
          
          <p className="hero-subtitle">
            TrapMap digitalisiert dein Schädlingsmonitoring. QR-Code scannen, 
            Status dokumentieren, Report generieren – fertig. 
            Audit-sicher in 2 Minuten.
          </p>

          <div className="hero-actions">
            <a href="#testen" className="btn-primary">
              Jetzt kostenlos starten
              <ArrowRight size={18} />
            </a>
            <a href="#features" className="btn-secondary">
              Features entdecken
            </a>
          </div>

          <div className="hero-highlight">
            <Timer size={20} />
            <span><strong>2 Minuten</strong> vom Scan bis zum fertigen Audit-Report</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-mockup">
            <div className="mockup-screen">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="mockup-title">TrapMap Dashboard</span>
              </div>
              <div className="mockup-content">
                <div className="mockup-sidebar"></div>
                <div className="mockup-main">
                  <div className="mockup-card"></div>
                  <div className="mockup-card"></div>
                  <div className="mockup-card small"></div>
                  <div className="mockup-card small"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          PROBLEM / SOLUTION
          ============================================ */}
      <section className="problem-section">
        <div className="section-container">
          <div className="problem-grid">
            <div className="problem-card">
              <h3>😤 Ohne TrapMap</h3>
              <ul>
                <li>Papierformulare ausfüllen</li>
                <li>Handschrift entziffern</li>
                <li>Daten abtippen</li>
                <li>Excel-Listen pflegen</li>
                <li>Audit-Ordner zusammensuchen</li>
                <li>Stundenlange Vorbereitung</li>
              </ul>
            </div>
            <div className="solution-card">
              <h3>🚀 Mit TrapMap</h3>
              <ul>
                <li><Check size={16} /> QR-Code scannen</li>
                <li><Check size={16} /> Status antippen</li>
                <li><Check size={16} /> Foto machen</li>
                <li><Check size={16} /> Fertig.</li>
                <li><Check size={16} /> Report per Knopfdruck</li>
                <li><Check size={16} /> Audit in 2 Minuten</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FEATURES
          ============================================ */}
      <section id="features" className="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2>Alles drin, was Profis brauchen</h2>
            <p>Und wenn dir was fehlt – wir bauen es für dich.</p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={QrCode}
              title="QR-Code Scanning"
              description="Jede Box bekommt einen QR-Code. Scannen, Status erfassen, fertig. Funktioniert mit jedem Smartphone."
            />
            <FeatureCard
              icon={MapPin}
              title="Digitale Lagepläne"
              description="Boxen auf Grundrissen oder GPS-Karten platzieren. Immer wissen wo was steht – auch bei 500 Boxen."
            />
            <FeatureCard
              icon={FileCheck}
              title="Automatische Reports"
              description="PDF-Reports per Knopfdruck. Mit allen Nachweisen die HACCP und IFS fordern. In 2 Minuten fertig."
            />
            <FeatureCard
              icon={Camera}
              title="Foto-Dokumentation"
              description="Vorher-Nachher Fotos, Köderstatus, Befunde – alles mit Zeitstempel und GPS-Position dokumentiert."
            />
            <FeatureCard
              icon={Clock}
              title="Kontrollintervalle"
              description="Flexible Intervalle pro Box und Objekt. Automatische Erinnerungen bei überfälligen Kontrollen."
            />
            <FeatureCard
              icon={Shield}
              title="Lückenlose Historie"
              description="Jede Kontrolle wird dokumentiert und ist nachvollziehbar. Für Audits und Nachweise."
            />
          </div>
        </div>
      </section>

      {/* ============================================
          INDIVIDUELL / FÜR PROFIS
          ============================================ */}
      <section id="individuell" className="individuell">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Für Profis</span>
            <h2>Wahnsinnig individuell</h2>
            <p>Jeder Kunde ist anders. TrapMap passt sich an.</p>
          </div>

          <div className="individuell-content">
            <div className="individuell-text">
              <h3>Du entscheidest, was deine Kunden sehen</h3>
              <p>
                Als Admin steuerst du alles: Welche Felder sollen ausgefüllt werden? 
                Sind Fotos Pflicht? Welche Status-Optionen gibt es? Pro Objekt konfigurierbar.
              </p>
              
              <ul className="individuell-list">
                <li>
                  <Sliders size={20} />
                  <div>
                    <strong>Pro Objekt konfigurierbar</strong>
                    <span>Unterschiedliche Einstellungen für Hotel, Küche, Lager</span>
                  </div>
                </li>
                <li>
                  <Camera size={20} />
                  <div>
                    <strong>Foto-Pflicht steuerbar</strong>
                    <span>Vorher-Foto? Nachher-Foto? Köder-Foto? Du bestimmst.</span>
                  </div>
                </li>
                <li>
                  <Users size={20} />
                  <div>
                    <strong>Partner-Accounts</strong>
                    <span>Gib deinen Kunden Lesezugriff auf ihre Objekte</span>
                  </div>
                </li>
                <li>
                  <Settings size={20} />
                  <div>
                    <strong>Immer mehr Features</strong>
                    <span>Wir entwickeln ständig weiter – nach deinem Feedback</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="individuell-visual">
              <div className="config-card">
                <div className="config-header">
                  <Settings size={18} />
                  Objekt-Einstellungen
                </div>
                <div className="config-item">
                  <span>Foto vor Kontrolle</span>
                  <div className="toggle active"></div>
                </div>
                <div className="config-item">
                  <span>Foto nach Kontrolle</span>
                  <div className="toggle active"></div>
                </div>
                <div className="config-item">
                  <span>Köder-Status erfassen</span>
                  <div className="toggle active"></div>
                </div>
                <div className="config-item">
                  <span>GPS-Position speichern</span>
                  <div className="toggle"></div>
                </div>
                <div className="config-item">
                  <span>Kommentar-Pflicht</span>
                  <div className="toggle"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          PARTNER ACCOUNT ERKLÄRUNG
          ============================================ */}
      <section className="partner-section">
        <div className="section-container">
          <div className="partner-card">
            <div className="partner-icon">
              <HandshakeIcon size={32} />
            </div>
            <div className="partner-content">
              <h3>Was ist ein Partner-Account?</h3>
              <p>
                Mit Partner-Accounts gibst du deinen <strong>Kunden direkten Lesezugriff</strong> auf ihre Objekte. 
                Sie können Status, Reports und Historie einsehen – ohne dass du PDFs verschicken musst.
              </p>
              <p>
                Perfekt für Kunden die regelmäßig Nachweise brauchen (Hotels, Lebensmittelindustrie, etc.). 
                Du sparst Zeit, der Kunde hat immer Zugriff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          PREISE
          ============================================ */}
      <section id="preise" className="pricing">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Preise</span>
            <h2>Faire Preise für jede Größe</h2>
            <p>Keine versteckten Kosten. Monatlich kündbar.</p>
          </div>

          <div className="beta-banner">
            <Sparkles size={20} />
            <div>
              <strong>Bis 01.02.2026 kostenlos testen!</strong>
              <span>Melde dich an, probier es aus, gib uns Feedback. Wir passen TrapMap an deine Bedürfnisse an.</span>
            </div>
          </div>

          <div className="pricing-grid">
            <PricingCard
              name="Einzelkämpfer"
              price="25"
              description="Für Solo-Schädlingsbekämpfer"
              features={[
                "1 Admin-Account",
                "3 Objekte",
                "50 Boxen",
                "QR-Code Scanning",
                "Digitale Lagepläne",
                "Automatische Reports",
                "E-Mail Support"
              ]}
              note="Kein Partner-Account"
            />
            <PricingCard
              name="3er Flat"
              price="65"
              description="Für kleine Teams"
              popular
              features={[
                "1 Admin + 2 Techniker",
                "5 Objekte",
                "150 Boxen",
                "Alle Features",
                "Foto-Dokumentation",
                "Intervall-Überwachung",
                "Priority Support"
              ]}
              note="Kein Partner-Account"
            />
            <PricingCard
              name="10er Runde"
              price="190"
              description="Für wachsende Betriebe"
              features={[
                "10 User (Admin/Techniker)",
                "20 Objekte",
                "650 Boxen",
                "Alle Features",
                "2 Partner-Accounts",
                "Individuelle Anpassungen",
                "Telefon-Support"
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="Individuell"
              description="Für große Organisationen"
              features={[
                "Unbegrenzte User",
                "Unbegrenzte Objekte",
                "Unbegrenzte Boxen",
                "Unbegrenzte Partner",
                "Eigenes Branding möglich",
                "Dedizierter Ansprechpartner",
                "SLA-Garantie"
              ]}
              enterprise
            />
          </div>

          <div className="pricing-cta">
            <Phone size={18} />
            <span>
              Fragen zu den Paketen? Ruf einfach an: <a href="tel:+4915202637089">0152 / 026 370 89</a>
            </span>
          </div>
        </div>
      </section>

      {/* ============================================
          CTA / TESTEN
          ============================================ */}
      <section id="testen" className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Bereit für papierloses Monitoring?</h2>
            <p>
              Teste TrapMap kostenlos bis Februar 2026. Kein Risiko, keine Kreditkarte. 
              Einfach anmelden und loslegen.
            </p>

            <form className="demo-form" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Dein Name" required />
              <input type="text" placeholder="Firma" required />
              <input type="email" placeholder="E-Mail" required />
              <input type="tel" placeholder="Telefon (optional)" />
              <textarea placeholder="Was erwartest du von TrapMap? (optional)" rows={3}></textarea>
              <button type="submit" className="btn-primary">
                Kostenlosen Zugang anfragen
                <ArrowRight size={18} />
              </button>
            </form>

            <p className="cta-note">
              Wir melden uns innerhalb von 24 Stunden bei dir.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer id="kontakt" className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="nav-brand">
              <span className="brand-trap">Trap</span>
              <span className="brand-map">Map</span>
            </div>
            <p>Digitales Schädlingsmonitoring für Profis.</p>
            <p className="footer-tagline">Nie wieder Zettelwirtschaft.</p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Produkt</h4>
              <a href="#features">Features</a>
              <a href="#preise">Preise</a>
              <a href="#testen">Kostenlos testen</a>
            </div>
            <div className="footer-col">
              <h4>Rechtliches</h4>
              <Link to="/impressum">Impressum</Link>
              <Link to="/datenschutz">Datenschutz</Link>
              <Link to="/agb">AGB</Link>
              <button 
                onClick={() => {
                  localStorage.removeItem("trapmap_cookie_consent");
                  localStorage.removeItem("trapmap_cookie_settings");
                  window.location.reload();
                }}
                className="footer-cookie-btn"
              >
                Cookie-Einstellungen
              </button>
            </div>
            <div className="footer-col">
              <h4>Kontakt</h4>
              <a href="mailto:info@trap-map.de">
                <Mail size={16} /> info@trap-map.de
              </a>
              <a href="tel:+4915202637089">
                <Phone size={16} /> 0152 / 026 370 89
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 TrapMap. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}

/* ============================================
   SUB-COMPONENTS
   ============================================ */

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function PricingCard({ name, price, description, features, popular, enterprise, note }) {
  return (
    <div className={`pricing-card ${popular ? 'popular' : ''}`}>
      {popular && <div className="popular-badge">Beliebt</div>}
      <h3>{name}</h3>
      <p className="pricing-desc">{description}</p>
      <div className="pricing-price">
        {enterprise ? (
          <span className="price-custom">{price}</span>
        ) : (
          <>
            <span className="price-amount">{price}€</span>
            <span className="price-period">/Monat</span>
          </>
        )}
      </div>
      <ul className="pricing-features">
        {features.map((feature, i) => (
          <li key={i}>
            <Check size={16} />
            {feature}
          </li>
        ))}
      </ul>
      {note && <p className="pricing-note-small">{note}</p>}
      <a href="#testen" className={`pricing-btn ${popular ? 'primary' : ''}`}>
        {enterprise ? 'Kontakt aufnehmen' : 'Kostenlos testen'}
      </a>
    </div>
  );
}