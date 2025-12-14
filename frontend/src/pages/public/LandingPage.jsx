/* ============================================================
   TRAPMAP - LANDING PAGE
   Marketing Website für trap-map.de
   ============================================================ */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  QrCode, Shield, BarChart3, MapPin, Clock, FileCheck,
  ChevronRight, Check, Menu, X, Play, Star,
  Building2, Utensils, Factory, Warehouse, ShoppingCart,
  Hotel, Stethoscope, Leaf, Phone, Mail, ArrowRight
} from "lucide-react";
import "./LandingPage.css";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

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

          {/* Desktop Menu */}
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#branchen">Branchen</a>
            <a href="#preise">Preise</a>
            <a href="#kontakt">Kontakt</a>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="nav-login">Anmelden</Link>
            <a href="#demo" className="nav-cta">Demo anfragen</a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#branchen" onClick={() => setMobileMenuOpen(false)}>Branchen</a>
            <a href="#preise" onClick={() => setMobileMenuOpen(false)}>Preise</a>
            <a href="#kontakt" onClick={() => setMobileMenuOpen(false)}>Kontakt</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Anmelden</Link>
            <a href="#demo" className="mobile-cta" onClick={() => setMobileMenuOpen(false)}>
              Demo anfragen
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
            <Shield size={16} />
            HACCP & IFS konform
          </div>
          
          <h1>
            Schädlingsmonitoring.
            <span className="gradient-text"> Digital.</span>
          </h1>
          
          <p className="hero-subtitle">
            TrapMap digitalisiert Ihr Schädlingsmonitoring. QR-Codes scannen, 
            Befunde dokumentieren, Berichte generieren – alles in einer App.
            Audit-sicher und zeitsparend.
          </p>

          <div className="hero-actions">
            <a href="#demo" className="btn-primary">
              Kostenlose Demo
              <ArrowRight size={18} />
            </a>
            <button className="btn-secondary" onClick={() => setShowDemo(true)}>
              <Play size={18} />
              Video ansehen
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <strong>50.000+</strong>
              <span>Boxen überwacht</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <strong>200+</strong>
              <span>Unternehmen</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <strong>99,9%</strong>
              <span>Audit-Erfolg</span>
            </div>
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
          FEATURES
          ============================================ */}
      <section id="features" className="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2>Alles was Sie brauchen</h2>
            <p>Von der Erfassung bis zum Audit-Bericht – TrapMap deckt den gesamten Prozess ab.</p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={QrCode}
              title="QR-Code Scanning"
              description="Jede Box bekommt einen QR-Code. Scannen, Status erfassen, fertig. Keine Zettelwirtschaft mehr."
            />
            <FeatureCard
              icon={MapPin}
              title="Digitale Lagepläne"
              description="Boxen auf Grundrissen oder GPS-Karten positionieren. Immer wissen wo was steht."
            />
            <FeatureCard
              icon={BarChart3}
              title="Echtzeit-Dashboard"
              description="Alle Standorte auf einen Blick. Überfällige Kontrollen sofort erkennen."
            />
            <FeatureCard
              icon={FileCheck}
              title="Audit-Berichte"
              description="PDF-Reports per Knopfdruck. Mit allen Nachweisen die HACCP und IFS fordern."
            />
            <FeatureCard
              icon={Clock}
              title="Kontrollintervalle"
              description="Flexible Intervalle pro Box. Automatische Erinnerungen bei überfälligen Kontrollen."
            />
            <FeatureCard
              icon={Shield}
              title="Lückenlose Historie"
              description="Jede Kontrolle wird dokumentiert. 5 Jahre Aufbewahrung inklusive."
            />
          </div>
        </div>
      </section>

      {/* ============================================
          BRANCHEN
          ============================================ */}
      <section id="branchen" className="branchen">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Branchen</span>
            <h2>Für alle die nachweisen müssen</h2>
            <p>Überall wo Hygiene-Audits gefordert sind, ist TrapMap die Lösung.</p>
          </div>

          <div className="branchen-grid">
            <BranchenCard icon={Utensils} name="Gastronomie & Hotels" />
            <BranchenCard icon={Factory} name="Lebensmittelindustrie" />
            <BranchenCard icon={ShoppingCart} name="Supermärkte" />
            <BranchenCard icon={Warehouse} name="Logistik & Lager" />
            <BranchenCard icon={Stethoscope} name="Krankenhäuser" />
            <BranchenCard icon={Building2} name="Pharmaindustrie" />
            <BranchenCard icon={Hotel} name="Pflegeheime" />
            <BranchenCard icon={Leaf} name="Landwirtschaft" />
          </div>
        </div>
      </section>

      {/* ============================================
          SOCIAL PROOF
          ============================================ */}
      <section className="testimonials">
        <div className="section-container">
          <div className="testimonial-card">
            <div className="stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="#eab308" color="#eab308" />)}
            </div>
            <blockquote>
              "Seit wir TrapMap nutzen, sparen wir pro Standort 2 Stunden pro Woche. 
              Die Audits laufen jetzt problemlos durch."
            </blockquote>
            <div className="testimonial-author">
              <div className="author-avatar">MK</div>
              <div>
                <strong>Michael Krause</strong>
                <span>Betriebsleiter, FoodCorp GmbH</span>
              </div>
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
            <h2>Einfache, faire Preise</h2>
            <p>Keine versteckten Kosten. Monatlich kündbar.</p>
          </div>

          <div className="pricing-grid">
            <PricingCard
              name="Starter"
              price="49"
              description="Für kleine Betriebe"
              features={[
                "Bis 100 Boxen",
                "1 Standort",
                "2 Benutzer",
                "QR-Code Scanning",
                "Basis-Berichte",
                "E-Mail Support"
              ]}
            />
            <PricingCard
              name="Professional"
              price="149"
              description="Für wachsende Unternehmen"
              popular
              features={[
                "Bis 500 Boxen",
                "5 Standorte",
                "10 Benutzer",
                "Digitale Lagepläne",
                "Erweiterte Berichte",
                "Priority Support",
                "API-Zugang"
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="Individuell"
              description="Für große Organisationen"
              features={[
                "Unbegrenzte Boxen",
                "Unbegrenzte Standorte",
                "Unbegrenzte Benutzer",
                "White-Label Option",
                "Dedicated Support",
                "SLA-Garantie",
                "On-Premise möglich"
              ]}
              enterprise
            />
          </div>
        </div>
      </section>

      {/* ============================================
          CTA / DEMO
          ============================================ */}
      <section id="demo" className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Bereit für digitales Monitoring?</h2>
            <p>
              Starten Sie jetzt mit einer kostenlosen Demo. 
              Wir zeigen Ihnen TrapMap in 15 Minuten.
            </p>

            <form className="demo-form" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Firma" required />
              <input type="email" placeholder="E-Mail" required />
              <input type="tel" placeholder="Telefon (optional)" />
              <button type="submit" className="btn-primary">
                Demo anfragen
                <ArrowRight size={18} />
              </button>
            </form>

            <p className="cta-note">
              Keine Kreditkarte erforderlich. Antwort innerhalb von 24 Stunden.
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
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Produkt</h4>
              <a href="#features">Features</a>
              <a href="#preise">Preise</a>
              <a href="#demo">Demo</a>
            </div>
            <div className="footer-col">
              <h4>Rechtliches</h4>
              <a href="/impressum">Impressum</a>
              <a href="/datenschutz">Datenschutz</a>
              <a href="/agb">AGB</a>
            </div>
            <div className="footer-col">
              <h4>Kontakt</h4>
              <a href="mailto:info@trap-map.de">
                <Mail size={16} /> info@trap-map.de
              </a>
              <a href="tel:+4940123456">
                <Phone size={16} /> +49 40 123 456
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2025 TrapMap. Alle Rechte vorbehalten.</p>
        </div>
      </footer>

      {/* Video Modal */}
      {showDemo && (
        <div className="video-modal" onClick={() => setShowDemo(false)}>
          <div className="video-content" onClick={e => e.stopPropagation()}>
            <button className="video-close" onClick={() => setShowDemo(false)}>
              <X size={24} />
            </button>
            <div className="video-placeholder">
              <Play size={64} />
              <p>Demo Video kommt bald!</p>
            </div>
          </div>
        </div>
      )}
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

function BranchenCard({ icon: Icon, name }) {
  return (
    <div className="branchen-card">
      <Icon size={32} />
      <span>{name}</span>
    </div>
  );
}

function PricingCard({ name, price, description, features, popular, enterprise }) {
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
      <a href="#demo" className={`pricing-btn ${popular ? 'primary' : ''}`}>
        {enterprise ? 'Kontakt aufnehmen' : 'Jetzt starten'}
      </a>
    </div>
  );
}