/* ============================================================
   TRAPMAP - LANDING PAGE (ECHTE INHALTE)
   Marketing Website für trap-map.de
   ============================================================ */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode, Shield, MapPin, Clock, FileCheck,
  Check, Menu, X, Camera, Settings, Users, Sliders,
  Phone, Mail, ArrowRight, Sparkles, Timer, UserCheck
} from "lucide-react";
import trapMapLogo from "../../assets/trapmap-logo-200.png";
import "./LandingPage.css";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Demo form state
  const [demoForm, setDemoForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    expectations: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Handle demo form submission
  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    
    if (!demoForm.name || !demoForm.email) {
      setSubmitMessage('Name und E-Mail sind erforderlich');
      setSubmitSuccess(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const API = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API}/demo/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demoForm)
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        
        // Check if account was created automatically
        if (result.account_created && result.organization && result.user) {
          setSubmitMessage(
            `🎉 Fantastisch ${demoForm.name}! Ihr Demo-Account wurde SOFORT erstellt!\n\n` +
            `✅ Login-Daten wurden an ${demoForm.email} gesendet\n` +
            `🏢 Organisation: ${result.organization.name}\n` +
            `🔗 Login-URL: ${result.login_url}\n\n` +
            `Sie können sich jetzt direkt einloggen! Checken Sie auch Ihr E-Mail-Postfach für die vollständigen Anmeldedaten.`
          );
          
          // Auto-redirect to login after 8 seconds with confirmation
          setTimeout(() => {
            if (window.confirm(
              '🚀 Möchten Sie jetzt direkt zur Login-Seite?\n\n' +
              'Ihre Login-Daten wurden per E-Mail verschickt.\n' +
              'Sie müssen nach dem ersten Login Ihr Passwort ändern.'
            )) {
              window.open('/login', '_blank');
            }
          }, 8000);
          
        } else {
          // Fallback message if auto-creation failed
          setSubmitMessage(`Vielen Dank ${demoForm.name}! Ihre Demo-Anfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden bei Ihnen.`);
        }
        
        setDemoForm({ name: '', company: '', email: '', phone: '', expectations: '' });
        
      } else {
        setSubmitSuccess(false);
        setSubmitMessage(result.error || 'Fehler beim Übermitteln der Anfrage');
      }
    } catch (error) {
      setSubmitSuccess(false);
      setSubmitMessage('Netzwerkfehler. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.');
      console.error('Demo request error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      {/* ============================================
          NAVIGATION
          ============================================ */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <img src={trapMapLogo} alt="TrapMap Logo" className="brand-logo" />
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
          <div className="hero-badges">
            <div className="hero-badge primary">
              <Sparkles size={16} />
              Bis 01.02.2026 kostenlos testen
            </div>
            <div className="hero-badge beta">
              <UserCheck size={16} />
              BETA Testphase - Jetzt mitmachen!
            </div>
          </div>
          
          <h1>
            <span className="hero-title-main">Nie wieder Zettelwirtschaft</span>
            <span className="gradient-text"> bei der Schädlingskontrolle.</span>
          </h1>
          
          <p className="hero-subtitle">
            <strong>TrapMap digitalisiert dein Schädlingsmonitoring.</strong> 
            QR-Code scannen, Status dokumentieren, Report generieren – fertig. 
            <span className="highlight-text">Audit-sicher in nur 2 Minuten.</span>
          </p>

          <div className="beta-notice">
            <div className="beta-icon">🚀</div>
            <div className="beta-text">
              <strong>Wir sind in der BETA-Phase!</strong>
              <p>Hilf uns TrapMap zu perfektionieren. Dein Feedback ist Gold wert und macht uns besser!</p>
            </div>
          </div>

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
          PREISE & PAKETE
          ============================================ */}
      <section id="preise" className="pricing-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Transparente Preise für jeden Bedarf</h2>
            <p>Wählen Sie das passende Paket für Ihr Unternehmen</p>
          </div>

          <div className="pricing-grid">
            {/* STARTER PAKET */}
            <div className="pricing-card starter">
              <div className="pricing-header">
                <h3>Starter</h3>
                <p>Für kleinere Betriebe</p>
                <div className="price">
                  <span className="amount">29€</span>
                  <span className="period">/Monat</span>
                </div>
              </div>
              <div className="pricing-features">
                <div className="feature">
                  <Check size={16} />
                  Bis zu 100 Boxen
                </div>
                <div className="feature">
                  <Check size={16} />
                  5 Objekte
                </div>
                <div className="feature">
                  <Check size={16} />
                  Grundreporting
                </div>
                <div className="feature">
                  <Check size={16} />
                  E-Mail Support
                </div>
                <div className="feature">
                  <Check size={16} />
                  Mobile App
                </div>
              </div>
              <button className="pricing-cta">Jetzt testen</button>
            </div>

            {/* PROFESSIONAL PAKET */}
            <div className="pricing-card professional popular">
              <div className="popular-badge">Beliebt</div>
              <div className="pricing-header">
                <h3>Professional</h3>
                <p>Für Schädlingsbekämpfer</p>
                <div className="price">
                  <span className="amount">79€</span>
                  <span className="period">/Monat</span>
                </div>
              </div>
              <div className="pricing-features">
                <div className="feature">
                  <Check size={16} />
                  Unbegrenzte Boxen
                </div>
                <div className="feature">
                  <Check size={16} />
                  Unbegrenzte Objekte
                </div>
                <div className="feature">
                  <Check size={16} />
                  Erweiterte Reports
                </div>
                <div className="feature">
                  <Check size={16} />
                  Kunden-Accounts (Viewer)
                </div>
                <div className="feature">
                  <Check size={16} />
                  Telefon Support
                </div>
                <div className="feature">
                  <Check size={16} />
                  API Zugang
                </div>
              </div>
              <button className="pricing-cta primary">Jetzt testen</button>
            </div>

            {/* ENTERPRISE PAKET */}
            <div className="pricing-card enterprise">
              <div className="pricing-header">
                <h3>Enterprise</h3>
                <p>Für große Unternehmen</p>
                <div className="price">
                  <span className="amount">Auf Anfrage</span>
                </div>
              </div>
              <div className="pricing-features">
                <div className="feature">
                  <Check size={16} />
                  Alles aus Professional
                </div>
                <div className="feature">
                  <Check size={16} />
                  White-Label Lösung
                </div>
                <div className="feature">
                  <Check size={16} />
                  Dedicated Support
                </div>
                <div className="feature">
                  <Check size={16} />
                  Custom Integrationen
                </div>
                <div className="feature">
                  <Check size={16} />
                  On-Premise Option
                </div>
              </div>
              <button className="pricing-cta">Kontakt aufnehmen</button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          ACCOUNT-TYPEN ERKLÄRUNG
          ============================================ */}
      <section className="accounts-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Die richtigen Accounts für jede Situation</h2>
            <p>Verstehen Sie die Unterschiede zwischen den verschiedenen Account-Typen</p>
          </div>

          <div className="accounts-grid">
            {/* PARTNER ACCOUNT */}
            <div className="account-card partner">
              <div className="account-icon">
                <Users size={32} />
              </div>
              <div className="account-content">
                <h3>Partner-Account</h3>
                <div className="account-badge">Für Kunden mit eigenen zertifizierten Mitarbeitern</div>
                <p>
                  <strong>Perfekt für Unternehmen mit eigenen Schädlingsexperten!</strong> 
                  Hotels, Restaurants oder Industriebetriebe mit zertifizierten Mitarbeitern 
                  können ihre Schädlingsfallen selbst kontrollieren und dokumentieren.
                </p>
                <div className="account-features">
                  <div className="feature">✓ Vollzugriff auf TrapMap</div>
                  <div className="feature">✓ Eigene Kontrollen durchführen</div>
                  <div className="feature">✓ Reports selbst erstellen</div>
                  <div className="feature">✓ Für zertifizierte Mitarbeiter</div>
                </div>
              </div>
            </div>

            {/* VIEWER ACCOUNT */}
            <div className="account-card viewer">
              <div className="account-icon">
                <Shield size={32} />
              </div>
              <div className="account-content">
                <h3>Viewer-Account (Kunden-Zugang)</h3>
                <div className="account-badge">Nur Lesezugriff für Ihre Kunden</div>
                <p>
                  Geben Sie Ihren Kunden direkten <strong>Lesezugriff</strong> auf ihre Objekte. 
                  Sie können Status, Reports und Historie einsehen – ohne dass Sie PDFs 
                  verschicken müssen.
                </p>
                <div className="account-features">
                  <div className="feature">✓ Nur Ansicht, keine Bearbeitung</div>
                  <div className="feature">✓ Aktuelle Status einsehen</div>
                  <div className="feature">✓ Reports herunterladen</div>
                  <div className="feature">✓ Historie durchsuchen</div>
                </div>
              </div>
            </div>

            {/* TECHNIKER ACCOUNT */}
            <div className="account-card technician">
              <div className="account-icon">
                <Radio size={32} />
              </div>
              <div className="account-content">
                <h3>Techniker-Account</h3>
                <div className="account-badge">Für Ihre Außendienstmitarbeiter</div>
                <p>
                  Ihre Techniker können Kontrollen durchführen, Boxen scannen 
                  und Status erfassen – aber haben keinen Zugriff auf 
                  Verwaltung oder Kundendaten.
                </p>
                <div className="account-features">
                  <div className="feature">✓ Kontrollen durchführen</div>
                  <div className="feature">✓ QR-Codes scannen</div>
                  <div className="feature">✓ Status dokumentieren</div>
                  <div className="feature">✓ Eingeschränkte Rechte</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          PREISE & PAKETE
          ============================================ */}
      <section id="preise" className="pricing-section">
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

            <form className="demo-form" onSubmit={handleDemoSubmit}>
              <input 
                type="text" 
                placeholder="Dein Name" 
                value={demoForm.name}
                onChange={(e) => setDemoForm({...demoForm, name: e.target.value})}
                required 
                disabled={isSubmitting}
              />
              <input 
                type="text" 
                placeholder="Firma" 
                value={demoForm.company}
                onChange={(e) => setDemoForm({...demoForm, company: e.target.value})}
                disabled={isSubmitting}
              />
              <input 
                type="email" 
                placeholder="E-Mail" 
                value={demoForm.email}
                onChange={(e) => setDemoForm({...demoForm, email: e.target.value})}
                required 
                disabled={isSubmitting}
              />
              <input 
                type="tel" 
                placeholder="Telefon (optional)" 
                value={demoForm.phone}
                onChange={(e) => setDemoForm({...demoForm, phone: e.target.value})}
                disabled={isSubmitting}
              />
              <textarea 
                placeholder="Was erwartest du von TrapMap? (optional)" 
                rows={3}
                value={demoForm.expectations}
                onChange={(e) => setDemoForm({...demoForm, expectations: e.target.value})}
                disabled={isSubmitting}
              ></textarea>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Wird übermittelt...' : 'Kostenlosen Zugang anfragen'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            {submitMessage && (
              <div className={`submit-message ${submitSuccess ? 'success' : 'error'}`}>
                {submitMessage}
              </div>
            )}

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