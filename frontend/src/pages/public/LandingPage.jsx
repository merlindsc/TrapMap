/* ============================================================
   TRAPMAP - PROFESSIONAL LANDING PAGE
   Mit realistischem Dashboard, Scan-Dialog & 5-Tier Pricing
   ============================================================ */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  QrCode, Shield, MapPin, Clock, FileCheck,
  Check, Menu, X, Camera, Settings, Users, Sliders,
  Phone, Mail, ArrowRight, Sparkles, Timer, UserCheck, Radio,
  LayoutDashboard, Box, Map, Scan, FileText, ChevronRight,
  Building2, AlertTriangle, CheckCircle2, AlertCircle, XCircle,
  Navigation, Crosshair, Save, ChevronDown, Tag, Hash, Calendar,
  Download, TrendingUp, Eye, Smartphone, Bell, Wifi, BarChart3,
  Zap, Globe, Lock, Headphones, Server, Crown, Star, Rocket,
  Target, ClipboardCheck, Image, MessageSquare, MapPinned
} from "lucide-react";
import trapMapLogo from "../../assets/trapmap-logo-200.png";
import "./LandingPage.css";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState('scanning');
  
  // Animated counter for stats
  const [animatedStats, setAnimatedStats] = useState({ scans: 0, boxes: 0, companies: 0 });
  
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedStats({
        scans: Math.floor(50000 * eased),
        boxes: Math.floor(12500 * eased),
        companies: Math.floor(85 * eased)
      });
      
      if (step >= steps) clearInterval(timer);
    }, interval);
    
    return () => clearInterval(timer);
  }, []);
  
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm)
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        if (result.account_created && result.organization && result.user) {
          setSubmitMessage(
            `🎉 Fantastisch ${demoForm.name}! Ihr Demo-Account wurde SOFORT erstellt!\n\n` +
            `✅ Login-Daten wurden an ${demoForm.email} gesendet\n` +
            `🏢 Organisation: ${result.organization.name}\n` +
            `🔗 Login-URL: ${result.login_url}\n\n` +
            `Sie können sich jetzt direkt einloggen!`
          );
          setTimeout(() => {
            if (window.confirm('🚀 Möchten Sie jetzt direkt zur Login-Seite?')) {
              window.open('/login', '_blank');
            }
          }, 8000);
        } else {
          setSubmitMessage(`Vielen Dank ${demoForm.name}! Viel Spaß mit TrapMap! Schauen Sie in Ihren Postkorb für weitere Informationen.`);
        }
        setDemoForm({ name: '', company: '', email: '', phone: '', expectations: '' });
      } else {
        setSubmitSuccess(false);
        setSubmitMessage(result.error || 'Fehler beim Übermitteln');
      }
    } catch (error) {
      setSubmitSuccess(false);
      setSubmitMessage('Netzwerkfehler. Bitte versuchen Sie es später erneut.');
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
            <img src={trapMapLogo} alt="TrapMap Logo" className="brand-logo" width="84" height="84" loading="eager" fetchpriority="high" />
          </div>

          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#dashboard-demo">Live Demo</a>
            <a href="#preise">Preise</a>
            <a href="#roadmap">Roadmap</a>
            <a href="#kontakt">Kontakt</a>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="nav-login">Anmelden</Link>
            <a href="#testen" className="nav-cta">Kostenlos testen</a>
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#dashboard-demo" onClick={() => setMobileMenuOpen(false)}>Live Demo</a>
            <a href="#preise" onClick={() => setMobileMenuOpen(false)}>Preise</a>
            <a href="#roadmap" onClick={() => setMobileMenuOpen(false)}>Roadmap</a>
            <a href="#kontakt" onClick={() => setMobileMenuOpen(false)}>Kontakt</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Anmelden</Link>
            <a href="#testen" className="mobile-cta" onClick={() => setMobileMenuOpen(false)}>
              Kostenlos testen
            </a>
          </div>
        )}
      </nav>

      {/* ============================================
          HERO SECTION - Enhanced
          ============================================ */}
      <section className="hero">
        <div className="hero-bg-effects">
          <div className="hero-gradient-orb orb-1"></div>
          <div className="hero-gradient-orb orb-2"></div>
          <div className="hero-grid-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badges">
            <div className="hero-badge primary">
              <Sparkles size={16} />
              Bis 01.03.2026 kostenlos testen
            </div>
            <div className="hero-badge beta">
              <Rocket size={16} />
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

          {/* Trust Badges */}
          <div className="trust-badges">
            <div className="trust-badge"><Shield size={14} /> HACCP</div>
            <div className="trust-badge"><Shield size={14} /> IFS</div>
            <div className="trust-badge"><Shield size={14} /> ISO 22000</div>
            <div className="trust-badge"><Lock size={14} /> DSGVO</div>
            <div className="trust-badge"><Shield size={14} /> AIB</div>
          </div>

          <div className="hero-actions">
            <a href="#testen" className="btn-primary btn-glow">
              Jetzt kostenlos starten
              <ArrowRight size={18} />
            </a>
            <a href="#dashboard-demo" className="btn-secondary">
              <Eye size={18} />
              Live Demo ansehen
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <div className="qr-scanner-demo">
                <div className="scanner-viewfinder">
                  <div className="scanner-corner tl"></div>
                  <div className="scanner-corner tr"></div>
                  <div className="scanner-corner bl"></div>
                  <div className="scanner-corner br"></div>
                  <div className="scanner-line"></div>
                </div>
                <div className="scanner-label">
                  <QrCode size={16} />
                  QR-Code scannen
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          PROBLEM / SOLUTION
          ============================================ */}
      <section className="problem-section" aria-labelledby="comparison-heading">
        <h2 id="comparison-heading" className="visually-hidden">Vergleich: Mit und ohne TrapMap</h2>
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
          REALISTIC DASHBOARD DEMO
          ============================================ */}
      <section id="dashboard-demo" className="dashboard-demo-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Live Demo</span>
            <h2>So sieht TrapMap in Aktion aus</h2>
            <p>Ein echtes Dashboard mit allen Funktionen – keine Mockups</p>
          </div>

          <div className="dashboard-showcase">
            {/* Browser Chrome */}
            <div className="browser-chrome">
              <div className="browser-header">
                <div className="browser-url">
                  <Lock size={12} />
                  <span>trap-map.de/dashboard</span>
                </div>
                <div className="browser-user">
                  <div className="user-avatar">M</div>
                  <span>Merlin</span>
                </div>
              </div>

              <div className="dashboard-content">
                {/* Sidebar */}
                <div className="demo-sidebar">
                  <div className="sidebar-logo">
                    <img src={trapMapLogo} alt="TrapMap" />
                  </div>
                  <div className="sidebar-badge">Admin</div>
                  <nav className="sidebar-nav">
                    <a className="nav-item active">
                      <LayoutDashboard size={18} />
                      <span>Dashboard</span>
                    </a>
                    <a className="nav-item">
                      <Building2 size={18} />
                      <span>Objekte</span>
                    </a>
                    <a className="nav-item">
                      <Box size={18} />
                      <span>Boxen</span>
                    </a>
                    <a className="nav-item">
                      <Map size={18} />
                      <span>Maps</span>
                    </a>
                    <a className="nav-item">
                      <Users size={18} />
                      <span>Techniker</span>
                    </a>
                    <a className="nav-item">
                      <FileText size={18} />
                      <span>Reports</span>
                    </a>
                    <a className="nav-item">
                      <QrCode size={18} />
                      <span>QR-Scanner</span>
                    </a>
                    <a className="nav-item">
                      <Settings size={18} />
                      <span>Einstellungen</span>
                    </a>
                  </nav>
                </div>

                {/* Main Content */}
                <div className="demo-main">
                  {/* Status Indicators Top Left */}
                  <div className="status-indicators-top">
                    <div className="status-dot-small green"></div>
                    <div className="status-dot-small yellow"></div>
                    <div className="status-dot-small orange"></div>
                    <div className="status-dot-small red"></div>
                  </div>
                  
                  <div className="demo-header">
                    <div>
                      <div className="demo-title" role="heading" aria-level="3">Dashboard</div>
                      <p>Übersicht über alle Aktivitäten</p>
                    </div>
                    <div className="header-actions">
                      <button className="filter-btn">
                        <Building2 size={16} />
                        Alle Objekte
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>

                  {/* KPI Cards Row */}
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-icon blue">
                        <Box size={20} />
                      </div>
                      <div className="kpi-content">
                        <span className="kpi-value">45</span>
                        <span className="kpi-label">Aktive Boxen</span>
                      </div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon green">
                        <Scan size={20} />
                      </div>
                      <div className="kpi-content">
                        <span className="kpi-value">45</span>
                        <span className="kpi-label">Scans heute</span>
                      </div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon orange">
                        <AlertCircle size={20} />
                      </div>
                      <div className="kpi-content">
                        <span className="kpi-value">0</span>
                        <span className="kpi-label">Überfällig</span>
                      </div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-icon purple">
                        <Clock size={20} />
                      </div>
                      <div className="kpi-content">
                        <span className="kpi-value">vor 1 Std</span>
                        <span className="kpi-label">Letzte Sync</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Overview */}
                  <div className="status-section">
                    <h3>Status Übersicht</h3>
                    <div className="status-grid">
                      <div className="status-card green">
                        <div className="status-dot green"></div>
                        <span className="status-value">31</span>
                        <span className="status-label">OK</span>
                      </div>
                      <div className="status-card yellow">
                        <div className="status-dot yellow"></div>
                        <span className="status-value">3</span>
                        <span className="status-label">Erhöht</span>
                      </div>
                      <div className="status-card orange">
                        <div className="status-dot orange"></div>
                        <span className="status-value">2</span>
                        <span className="status-label">Auffällig</span>
                      </div>
                      <div className="status-card red">
                        <div className="status-dot red"></div>
                        <span className="status-value">6</span>
                        <span className="status-label">Befall</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Grid: Map + Recent Scans */}
                  <div className="dashboard-bottom-grid">
                    {/* Map Section */}
                    <div className="map-section">
                      <h3>Objekte auf Karte</h3>
                      <div className="map-container">
                        <div className="map-tiles"></div>
                        {/* Object Markers */}
                        <div className="map-marker green" style={{top: '25%', left: '30%'}}>
                          <Building2 size={12} />
                          <span className="marker-label">Hotel Maritim</span>
                        </div>
                        <div className="map-marker yellow" style={{top: '45%', left: '55%'}}>
                          <Building2 size={12} />
                          <span className="marker-label">Restaurant Löwe</span>
                        </div>
                        <div className="map-marker green" style={{top: '65%', left: '25%'}}>
                          <Building2 size={12} />
                          <span className="marker-label">Bäckerei Schmidt</span>
                        </div>
                        <div className="map-marker red" style={{top: '35%', left: '70%'}}>
                          <Building2 size={12} />
                          <span className="marker-label">Lager Nord</span>
                        </div>
                        {/* Box Dots */}
                        <div className="box-dot green" style={{top: '22%', left: '28%'}}></div>
                        <div className="box-dot green" style={{top: '28%', left: '33%'}}></div>
                        <div className="box-dot yellow" style={{top: '43%', left: '52%'}}></div>
                        <div className="box-dot green" style={{top: '48%', left: '58%'}}></div>
                        <div className="box-dot orange" style={{top: '63%', left: '22%'}}></div>
                        <div className="box-dot green" style={{top: '68%', left: '28%'}}></div>
                        <div className="box-dot red" style={{top: '33%', left: '68%'}}></div>
                        <div className="box-dot red" style={{top: '38%', left: '73%'}}></div>
                      </div>
                      <div className="map-legend">
                        <div className="legend-item"><span className="legend-dot green"></span> OK</div>
                        <div className="legend-item"><span className="legend-dot yellow"></span> Auffällig</div>
                        <div className="legend-item"><span className="legend-dot orange"></span> Erhöht</div>
                        <div className="legend-item"><span className="legend-dot red"></span> Befall</div>
                      </div>
                    </div>

                    {/* Recent Scans */}
                    <div className="recent-scans-section">
                      <div className="scans-header">
                        <h3>Letzte Scans</h3>
                        <button className="view-all-btn">
                          Alle anzeigen <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="scans-list">
                        <div className="object-group">
                          <div className="object-header">
                            <span className="object-dot blue"></span>
                            <span className="object-name">AIRBUS</span>
                            <span className="object-count">5 Scans</span>
                          </div>
                          <div className="scan-item">
                            <span className="scan-dot orange"></span>
                            <div className="scan-info">
                              <span className="scan-box">Box 13</span>
                              <span className="scan-status">Status: orange</span>
                            </div>
                            <div className="scan-meta">
                              <span className="scan-time">vor 1 Std</span>
                              <span className="scan-user">Merlin Hanika</span>
                            </div>
                          </div>
                          <div className="scan-item">
                            <span className="scan-dot orange"></span>
                            <div className="scan-info">
                              <span className="scan-box">Box 14</span>
                              <span className="scan-status">Status: orange</span>
                            </div>
                            <div className="scan-meta">
                              <span className="scan-time">vor 12 Std</span>
                              <span className="scan-user">Merlin Hanika</span>
                            </div>
                          </div>
                          <div className="scan-item">
                            <span className="scan-dot green"></span>
                            <div className="scan-info">
                              <span className="scan-box">Box 15</span>
                              <span className="scan-status">Status: green</span>
                            </div>
                            <div className="scan-meta">
                              <span className="scan-time">vor 22 Std</span>
                              <span className="scan-user">Merlin Hanika</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Control Dialog */}
                <div className="control-dialog">
                  <div className="dialog-header">
                    <div className="dialog-box-info">
                      <span className="box-number">1</span>
                      <div className="box-details">
                        <span className="box-title">Box #1 <button className="edit-btn" aria-label="Box bearbeiten">✏️ Bearbeiten</button></span>
                        <span className="box-type">Rattenköderstation · <span className="qr-badge"># QR 32</span> · <span className="nr-badge">(Nr. 1)</span></span>
                      </div>
                    </div>
                    <button className="close-btn" aria-label="Dialog schließen">×</button>
                  </div>

                  <div className="dialog-tabs">
                    <button className="tab active">
                      <CheckCircle2 size={14} /> Kontrolle
                    </button>
                    <button className="tab">
                      <Clock size={14} /> Verlauf (20)
                    </button>
                  </div>

                  <div className="dialog-content">
                    {/* Mini Map with GPS Circle */}
                    <div className="dialog-map">
                      <div className="dialog-map-tiles"></div>
                      <div className="gps-accuracy-circle"></div>
                      <div className="gps-marker">
                        <Navigation size={12} />
                      </div>
                      <div className="box-position-marker">
                        <Crosshair size={14} />
                      </div>
                    </div>
                    <div className="map-label">
                      <MapPin size={14} />
                      Box-Position auf Karte
                    </div>

                    {/* Köderaufnahme Slider */}
                    <div className="slider-section">
                      <div className="slider-header">
                        <span>Köderaufnahme</span>
                        <span className="slider-value">0%</span>
                      </div>
                      <div className="slider-track">
                        <div className="slider-fill" style={{width: '0%'}}></div>
                        <div className="slider-thumb" style={{left: '0%'}}></div>
                      </div>
                      <div className="slider-labels">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Status Selection */}
                    <div className="status-selection">
                      <div className="status-option active green">
                        <CheckCircle2 size={16} />
                        <span>Status: OK</span>
                      </div>
                    </div>

                    {/* Notizen */}
                    <div className="notes-section">
                      <label>Notizen</label>
                      <textarea placeholder="Optional: Auffälligkeiten, Maßnahmen..."></textarea>
                    </div>

                    {/* Foto */}
                    <div className="photo-section">
                      <label>Foto</label>
                      <button className="photo-btn">
                        <Camera size={18} />
                        Foto aufnehmen
                      </button>
                    </div>

                    {/* Position Button */}
                    <button className="position-btn">
                      <MapPinned size={16} />
                      Position verschieben
                    </button>

                    {/* Save Button */}
                    <button className="save-btn">
                      <Save size={18} />
                      Kontrolle speichern
                    </button>

                    <button className="back-btn">
                      <Box size={16} />
                      Zurück ins Lager
                    </button>
                  </div>
                </div>
              </div>
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

          {/* Feature Tabs */}
          <div className="feature-tabs">
            <button 
              className={`feature-tab ${activeFeatureTab === 'scanning' ? 'active' : ''}`}
              onClick={() => setActiveFeatureTab('scanning')}
            >
              <QrCode size={18} /> QR-Scanning
            </button>
            <button 
              className={`feature-tab ${activeFeatureTab === 'maps' ? 'active' : ''}`}
              onClick={() => setActiveFeatureTab('maps')}
            >
              <Map size={18} /> Lagepläne
            </button>
            <button 
              className={`feature-tab ${activeFeatureTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveFeatureTab('reports')}
            >
              <FileText size={18} /> Reports
            </button>
            <button 
              className={`feature-tab ${activeFeatureTab === 'intervals' ? 'active' : ''}`}
              onClick={() => setActiveFeatureTab('intervals')}
            >
              <Clock size={18} /> Intervalle
            </button>
          </div>

          <div className="feature-content">
            {activeFeatureTab === 'scanning' && (
              <div className="feature-detail">
                <div className="feature-info">
                  <h3>QR-Code Scanning</h3>
                  <p>Jede Box bekommt einen einzigartigen QR-Code. Einfach mit dem Smartphone scannen und sofort die Kontrolle durchführen.</p>
                  <ul className="feature-list">
                    <li><Check size={16} /> Funktioniert mit jedem Smartphone</li>
                    <li><Check size={16} /> Offline-fähig für Keller & Lager</li>
                    <li><Check size={16} /> Automatische Box-Erkennung</li>
                    <li><Check size={16} /> GPS-Position optional speichern</li>
                  </ul>
                </div>
                <div className="feature-visual">
                  <div className="phone-demo">
                    <div className="phone-demo-screen">
                      <div className="scan-preview">
                        <div className="scan-target">
                          <QrCode size={48} />
                        </div>
                        <div className="scan-result">
                          <CheckCircle2 size={24} className="green" />
                          <span>Box M-024 erkannt</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'maps' && (
              <div className="feature-detail">
                <div className="feature-info">
                  <h3>Digitale Lagepläne</h3>
                  <p>Laden Sie Grundrisse hoch oder nutzen Sie GPS-Karten. Platzieren Sie Boxen per Drag & Drop – immer wissen wo was steht.</p>
                  <ul className="feature-list">
                    <li><Check size={16} /> Grundrisse als Bild hochladen</li>
                    <li><Check size={16} /> GPS-Karten mit Satellitenansicht</li>
                    <li><Check size={16} /> Boxen per Drag & Drop platzieren</li>
                    <li><Check size={16} /> Status-Farben auf einen Blick</li>
                  </ul>
                </div>
                <div className="feature-visual">
                  <div className="floorplan-demo">
                    <div className="floorplan-grid">
                      <div className="room kitchen">Küche</div>
                      <div className="room storage">Lager</div>
                      <div className="room office">Büro</div>
                    </div>
                    <div className="fp-box green" style={{top: '20%', left: '15%'}}>1</div>
                    <div className="fp-box green" style={{top: '60%', left: '25%'}}>2</div>
                    <div className="fp-box yellow" style={{top: '30%', left: '55%'}}>3</div>
                    <div className="fp-box green" style={{top: '70%', left: '65%'}}>4</div>
                    <div className="fp-box red" style={{top: '40%', left: '80%'}}>5</div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'reports' && (
              <div className="feature-detail">
                <div className="feature-info">
                  <h3>Automatische Reports</h3>
                  <p>PDF-Reports per Knopfdruck. Mit allen Nachweisen die HACCP und IFS fordern. Wählen Sie zwischen verschiedenen Report-Typen.</p>
                  <ul className="feature-list">
                    <li><Check size={16} /> Report Einfach – Schnellübersicht</li>
                    <li><Check size={16} /> Report Pro – Vollständige Dokumentation</li>
                    <li><Check size={16} /> Gefahrenanalyse – Befallsbewertung</li>
                    <li><Check size={16} /> Automatischer E-Mail-Versand</li>
                  </ul>
                </div>
                <div className="feature-visual">
                  <div className="reports-demo">
                    <div className="report-card">
                      <div className="report-icon green"><FileText size={24} /></div>
                      <h4>Report Einfach</h4>
                      <p>Schneller Report mit Pflichtfeldern</p>
                      <span className="report-link"><Download size={14} /> Report erstellen</span>
                    </div>
                    <div className="report-card">
                      <div className="report-icon purple"><FileCheck size={24} /></div>
                      <h4>Report Pro</h4>
                      <p>Detaillierter Report mit Statistiken</p>
                      <span className="report-link"><Download size={14} /> Report erstellen</span>
                    </div>
                    <div className="report-card">
                      <div className="report-icon orange"><AlertTriangle size={24} /></div>
                      <h4>Gefahrenanalyse</h4>
                      <p>Befallsbezogene Bewertung</p>
                      <span className="report-link"><Download size={14} /> Report erstellen</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'intervals' && (
              <div className="feature-detail">
                <div className="feature-info">
                  <h3>Flexible Kontrollintervalle</h3>
                  <p>Definieren Sie für jede Box individuelle Intervalle. Fix oder als Range – TrapMap erinnert automatisch bei überfälligen Kontrollen.</p>
                  <ul className="feature-list">
                    <li><Check size={16} /> Fix: Exakt alle X Tage</li>
                    <li><Check size={16} /> Range: Zwischen X und Y Tagen</li>
                    <li><Check size={16} /> Von 7 Tagen bis 90 Tage</li>
                    <li><Check size={16} /> Automatische Erinnerungen</li>
                  </ul>
                </div>
                <div className="feature-visual">
                  <div className="interval-demo">
                    <div className="interval-header">
                      <Clock size={18} />
                      <span>Kontrollintervall</span>
                    </div>
                    <div className="interval-tabs">
                      <button className="active">Fix</button>
                      <button>Range</button>
                    </div>
                    <div className="interval-options">
                      <button>7 Tage<span>wöchentlich</span></button>
                      <button>14 Tage<span>2 Wochen</span></button>
                      <button>21 Tage<span>3 Wochen</span></button>
                      <button className="active">30 Tage<span>monatlich</span></button>
                      <button>60 Tage<span>2 Monate</span></button>
                      <button>90 Tage<span>quartalsweise</span></button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
          5-TIER PRICING
          ============================================ */}
      <section id="preise" className="pricing-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Preise</span>
            <h2>Für jeden die richtige Lösung</h2>
            <p>Von Einzelkämpfer bis Enterprise – transparent & fair</p>
          </div>

          <div className="beta-pricing-banner">
            <Sparkles size={24} />
            <div>
              <strong>🎉 BETA-Phase: Alle Features kostenlos bis 01.03.2026!</strong>
              <span>Teste TrapMap ohne Risiko und entscheide dann.</span>
            </div>
          </div>

          <div className="pricing-grid-5">
            {/* SOLO */}
            <div className="price-card">
              <div className="price-tier">Solo</div>
              <div className="price-desc">Für Einzelkämpfer</div>
              <div className="price-amount">
                <span className="currency">€</span>
                <span className="value">29</span>
                <span className="period">/Monat</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> 1 Benutzer</li>
                <li><Check size={16} /> 5 Objekte</li>
                <li><Check size={16} /> 100 Boxen</li>
                <li><Check size={16} /> QR-Scanning</li>
                <li><Check size={16} /> PDF Reports</li>
                <li><Check size={16} /> E-Mail Support</li>
              </ul>
              <a href="#testen" className="price-btn">Kostenlos testen</a>
            </div>

            {/* STARTER */}
            <div className="price-card">
              <div className="price-tier">Starter</div>
              <div className="price-desc">Für kleine Teams</div>
              <div className="price-amount">
                <span className="currency">€</span>
                <span className="value">79</span>
                <span className="period">/Monat</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> 3 Benutzer</li>
                <li><Check size={16} /> 15 Objekte</li>
                <li><Check size={16} /> 300 Boxen</li>
                <li><Check size={16} /> Partner-Accounts</li>
                <li><Check size={16} /> Erweiterte Reports</li>
                <li><Check size={16} /> Prioritäts-Support</li>
              </ul>
              <a href="#testen" className="price-btn">Kostenlos testen</a>
            </div>

            {/* PROFESSIONAL - Popular */}
            <div className="price-card popular">
              <div className="popular-badge"><Star size={14} /> Beliebt</div>
              <div className="price-tier">Professional</div>
              <div className="price-desc">Für wachsende Unternehmen</div>
              <div className="price-amount">
                <span className="currency">€</span>
                <span className="value">149</span>
                <span className="period">/Monat</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> 10 Benutzer</li>
                <li><Check size={16} /> 50 Objekte</li>
                <li><Check size={16} /> 1.000 Boxen</li>
                <li><Check size={16} /> Alle Report-Typen</li>
                <li><Check size={16} /> API-Zugang</li>
                <li><Check size={16} /> Telefon-Support</li>
              </ul>
              <a href="#testen" className="price-btn primary">Kostenlos testen</a>
            </div>

            {/* BUSINESS */}
            <div className="price-card">
              <div className="price-tier">Business</div>
              <div className="price-desc">Für große Teams</div>
              <div className="price-amount">
                <span className="currency">€</span>
                <span className="value">299</span>
                <span className="period">/Monat</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> 25 Benutzer</li>
                <li><Check size={16} /> 150 Objekte</li>
                <li><Check size={16} /> 5.000 Boxen</li>
                <li><Check size={16} /> White-Label Option</li>
                <li><Check size={16} /> Dedicated Manager</li>
                <li><Check size={16} /> SLA 99.5%</li>
              </ul>
              <a href="#testen" className="price-btn">Kostenlos testen</a>
            </div>

            {/* ENTERPRISE */}
            <div className="price-card enterprise">
              <div className="price-tier"><Crown size={18} /> Enterprise</div>
              <div className="price-desc">Für Konzerne & Ketten</div>
              <div className="price-amount">
                <span className="value custom">Individuell</span>
              </div>
              <ul className="price-features">
                <li><Check size={16} /> Unbegrenzt Benutzer</li>
                <li><Check size={16} /> Unbegrenzt Objekte</li>
                <li><Check size={16} /> Unbegrenzt Boxen</li>
                <li><Check size={16} /> SSO / SAML</li>
                <li><Check size={16} /> Custom Integrations</li>
                <li><Check size={16} /> 24/7 Support</li>
                <li><Check size={16} /> On-Premise Option</li>
              </ul>
              <a href="#kontakt" className="price-btn">Kontakt aufnehmen</a>
            </div>
          </div>

          <p className="pricing-note">Alle Preise zzgl. MwSt. · Jährliche Zahlung: 1 Monat gratis</p>
        </div>
      </section>

      {/* ============================================
          ROADMAP
          ============================================ */}
      <section id="roadmap" className="roadmap-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Roadmap</span>
            <h2>Was wir haben & was noch kommt</h2>
            <p>Transparent: So entwickelt sich TrapMap weiter</p>
          </div>

          <div className="roadmap-grid">
            {/* Already Available */}
            <div className="roadmap-column available">
              <div className="roadmap-header">
                <CheckCircle2 size={24} />
                <h3>Bereits verfügbar</h3>
              </div>
              <div className="roadmap-items">
                <div className="roadmap-item done">
                  <QrCode size={18} />
                  <span>QR-Code Scanning</span>
                </div>
                <div className="roadmap-item done">
                  <Map size={18} />
                  <span>Digitale Karten & GPS</span>
                </div>
                <div className="roadmap-item done">
                  <FileText size={18} />
                  <span>PDF Reports (3 Typen)</span>
                </div>
                <div className="roadmap-item done">
                  <Camera size={18} />
                  <span>Foto-Dokumentation</span>
                </div>
                <div className="roadmap-item done">
                  <Users size={18} />
                  <span>Team & Rollen</span>
                </div>
                <div className="roadmap-item done">
                  <Clock size={18} />
                  <span>Flexible Intervalle</span>
                </div>
                <div className="roadmap-item done">
                  <BarChart3 size={18} />
                  <span>Dashboard & KPIs</span>
                </div>
                <div className="roadmap-item done">
                  <Shield size={18} />
                  <span>Lückenlose Historie</span>
                </div>
              </div>
            </div>

            {/* In Development */}
            <div className="roadmap-column development">
              <div className="roadmap-header">
                <Zap size={24} />
                <h3>In Entwicklung</h3>
              </div>
              <div className="roadmap-items">
                <div className="roadmap-item progress">
                  <Smartphone size={18} />
                  <div className="item-content">
                    <span>Mobile App (iOS/Android)</span>
                    <div className="progress-bar"><div className="progress-fill" style={{width: '70%'}}></div></div>
                  </div>
                </div>
                <div className="roadmap-item progress">
                  <Bell size={18} />
                  <div className="item-content">
                    <span>Push-Benachrichtigungen</span>
                    <div className="progress-bar"><div className="progress-fill" style={{width: '50%'}}></div></div>
                  </div>
                </div>
                <div className="roadmap-item progress">
                  <Wifi size={18} />
                  <div className="item-content">
                    <span>Offline-Modus</span>
                    <div className="progress-bar"><div className="progress-fill" style={{width: '40%'}}></div></div>
                  </div>
                </div>
                <div className="roadmap-item progress">
                  <Mail size={18} />
                  <div className="item-content">
                    <span>Automatische E-Mail Reports</span>
                    <div className="progress-bar"><div className="progress-fill" style={{width: '60%'}}></div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Planned */}
            <div className="roadmap-column planned">
              <div className="roadmap-header">
                <Target size={24} />
                <h3>Geplant für 2026</h3>
              </div>
              <div className="roadmap-items">
                <div className="roadmap-item">
                  <Radio size={18} />
                  <span>IoT Integration (PestCam, Sensoren)</span>
                </div>
                <div className="roadmap-item">
                  <TrendingUp size={18} />
                  <span>Erweiterte Analytics & Trends</span>
                </div>
                <div className="roadmap-item">
                  <Globe size={18} />
                  <span>API & Webhooks</span>
                </div>
                <div className="roadmap-item">
                  <Server size={18} />
                  <span>Multi-Tenant Management</span>
                </div>
                <div className="roadmap-item">
                  <Sparkles size={18} />
                  <span>KI-basierte Befall-Erkennung</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          ACCOUNT TYPES
          ============================================ */}
      <section className="accounts-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Account-Typen</span>
            <h2>Die richtigen Zugänge für jede Rolle</h2>
            <p>Flexible Rechteverwaltung für Ihr Team und Ihre Kunden</p>
          </div>

          <div className="accounts-grid">
            <div className="account-card admin">
              <div className="account-icon">
                <Crown size={28} />
              </div>
              <h3>Admin-Account</h3>
              <div className="account-badge">Volle Kontrolle</div>
              <p>Komplette Verwaltung aller Funktionen, Benutzer, Objekte und Einstellungen.</p>
              <div className="account-features">
                <div className="feature"><Check size={14} /> Alle Verwaltungsfunktionen</div>
                <div className="feature"><Check size={14} /> Benutzer anlegen & verwalten</div>
                <div className="feature"><Check size={14} /> Reports & Auswertungen</div>
                <div className="feature"><Check size={14} /> Einstellungen & Konfiguration</div>
              </div>
            </div>

            <div className="account-card technician">
              <div className="account-icon">
                <Radio size={28} />
              </div>
              <h3>Techniker-Account</h3>
              <div className="account-badge">Für Außendienst</div>
              <p>Kontrollen durchführen, QR-Codes scannen, Fotos dokumentieren – ohne Admin-Rechte.</p>
              <div className="account-features">
                <div className="feature"><Check size={14} /> Kontrollen durchführen</div>
                <div className="feature"><Check size={14} /> QR-Codes scannen</div>
                <div className="feature"><Check size={14} /> Status dokumentieren</div>
                <div className="feature"><Check size={14} /> Eingeschränkte Rechte</div>
              </div>
            </div>

            <div className="account-card partner">
              <div className="account-icon">
                <Users size={28} />
              </div>
              <h3>Partner-Account</h3>
              <div className="account-badge">Für zertifizierte Kunden</div>
              <p>Für Unternehmen mit eigenen zertifizierten Mitarbeitern – voller Zugriff auf eigene Objekte.</p>
              <div className="account-features">
                <div className="feature"><Check size={14} /> Vollzugriff auf eigene Objekte</div>
                <div className="feature"><Check size={14} /> Eigene Kontrollen durchführen</div>
                <div className="feature"><Check size={14} /> Reports selbst erstellen</div>
                <div className="feature"><Check size={14} /> Für zertifizierte Mitarbeiter</div>
              </div>
            </div>

            <div className="account-card viewer">
              <div className="account-icon">
                <Eye size={28} />
              </div>
              <h3>Viewer-Account</h3>
              <div className="account-badge">Nur Lesezugriff</div>
              <p>Für Kunden ohne eigene Kontrollen – Status einsehen, Reports herunterladen, Historie durchsuchen.</p>
              <div className="account-features">
                <div className="feature"><Check size={14} /> Status einsehen</div>
                <div className="feature"><Check size={14} /> Reports herunterladen</div>
                <div className="feature"><Check size={14} /> Historie durchsuchen</div>
                <div className="feature"><Check size={14} /> Keine Bearbeitung</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          TESTIMONIALS
          ============================================ */}
      <section className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Kundenstimmen</span>
            <h2>Was unsere Nutzer sagen</h2>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="stars">★★★★★</div>
              <p>"Audit auf Knopfdruck erleichtert mir die Arbeit sehr"</p>
              <div className="testimonial-author">
                <div className="author-avatar">SN</div>
                <div>
                  <strong>SBK Nord</strong>
                  <span>Schädlingsbekämpfung</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FAQ
          ============================================ */}
      <section className="faq-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">FAQ</span>
            <h2>Häufige Fragen</h2>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <h4>Wie schnell kann ich starten?</h4>
              <p>Sofort! Nach der Registrierung können Sie direkt loslegen. QR-Codes drucken, Boxen anlegen, erste Kontrolle durchführen – alles in unter 10 Minuten.</p>
            </div>
            <div className="faq-item">
              <h4>Brauche ich spezielle Hardware?</h4>
              <p>Nein! TrapMap funktioniert mit jedem Smartphone. Die Web-App läuft im Browser, eine native App für iOS/Android kommt bald.</p>
            </div>
            <div className="faq-item">
              <h4>Sind meine Daten sicher?</h4>
              <p>Absolut. Alle Daten werden verschlüsselt übertragen und auf deutschen Servern gespeichert. DSGVO-konform.</p>
            </div>
            <div className="faq-item">
              <h4>Kann ich während der BETA kündigen?</h4>
              <p>Die BETA ist komplett kostenlos und unverbindlich bis mindestens März 2026. Danach entscheiden Sie, ob Sie weitermachen möchten.</p>
            </div>
            <div className="faq-item">
              <h4>Was passiert nach der BETA?</h4>
              <p>Sie wählen ein Paket, das zu Ihnen passt. Alle Daten bleiben erhalten. BETA-Tester erhalten Sonderkonditionen.</p>
            </div>
            <div className="faq-item">
              <h4>Gibt es eine Mobile App?</h4>
              <p>Die Web-App ist mobil-optimiert. Native iOS/Android Apps sind in Entwicklung und kommen Anfang 2026.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CTA / DEMO FORM
          ============================================ */}
      <section id="testen" className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Bereit für papierloses Monitoring?</h2>
            <p>
              Teste TrapMap kostenlos bis mindestens März 2026. Kein Risiko, keine Kreditkarte. 
              20 QR-Codes = 20 Boxen sofort einsatzbereit. Objekt erstellen und direkt loslegen!
            </p>

            <form className="demo-form" onSubmit={handleDemoSubmit}>
              <div className="form-row">
                <input 
                  type="text" 
                  placeholder="Dein Name *" 
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
              </div>
              <div className="form-row">
                <input 
                  type="email" 
                  placeholder="E-Mail *" 
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
              </div>
              <textarea 
                placeholder="Was erwartest du von TrapMap? (optional)" 
                rows={3}
                value={demoForm.expectations}
                onChange={(e) => setDemoForm({...demoForm, expectations: e.target.value})}
                disabled={isSubmitting}
              ></textarea>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Wird übermittelt...' : 'Demo starten - 20 QR-Codes inklusive'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            {submitMessage && (
              <div className={`submit-message ${submitSuccess ? 'success' : 'error'}`}>
                {submitMessage}
              </div>
            )}

            <p className="cta-note">
              Ihr Demo-Account wird sofort erstellt! Schauen Sie in Ihren Postkorb für die Login-Daten.
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
            <img src={trapMapLogo} alt="TrapMap" className="footer-logo" width="64" height="64" loading="lazy" />
            <p>Digitales Schädlingsmonitoring für Profis.</p>
            <p className="footer-tagline">Nie wieder Zettelwirtschaft.</p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Produkt</h4>
              <a href="#features">Features</a>
              <a href="#preise">Preise</a>
              <a href="#roadmap">Roadmap</a>
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