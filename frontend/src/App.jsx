/* ============================================================
   TRAPMAP - APP.JSX
   Mit ThemeProvider und Landing Page
   ============================================================ */

import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./components/layout/DashboardLayout";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import Login from "./pages/Login";

// Partner Components (lazy loaded)
const PartnerLogin = lazy(() => import("./pages/PartnerLogin").catch(() => ({ default: () => <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400">PartnerLogin.jsx nicht gefunden</div> })));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard").catch(() => ({ default: () => <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400">PartnerDashboard.jsx nicht gefunden</div> })));

// Layout & Pages
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import TechnicianHome from "./pages/technician/TechnicianHome";
import ObjectList from "./pages/objects/ObjectList";
import ObjectDetails from "./pages/objects/ObjectDetails";
import ObjectCreate from "./pages/objects/ObjectCreate";
import LayoutEditor from "./pages/layouts/LayoutEditor";
import LayoutList from "./pages/layouts/LayoutList";
import LayoutCreate from "./pages/layouts/LayoutCreate";
import Maps from "./pages/maps/Maps";
import Scanner from "./pages/qr/Scanner";
import AssignCode from "./pages/qr/AssignCode";
import AssignObject from "./pages/qr/AssignObject";
import QRRedirect from "./pages/qr/QRRedirect";
import Settings from "./pages/settings/Settings";
import Reports from "./pages/reports/Reports";
import Admin from "./pages/admin/Admin";
import BoxPool from "./pages/boxes/BoxPool";

// Super-Admin E-Mails
const SUPER_ADMINS = ["admin@demo.trapmap.de", "merlin@trapmap.de", "hilfe@die-schaedlingsexperten.de"];

// Loading Fallback
const LoadingFallback = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="loading-logo">
        <span className="logo-trap">Trap</span>
        <span className="logo-map">Map</span>
      </div>
      <div className="loading-spinner" />
    </div>
    <style>{`
      .loading-screen {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--bg-primary, #0b1120);
      }
      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
      }
      .loading-logo {
        font-size: 32px;
        font-weight: 700;
        display: flex;
      }
      .logo-trap {
        color: var(--text-primary, #fff);
      }
      .logo-map {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-color, rgba(255,255,255,0.1));
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ============================================
// STATISCHE SEITEN (Impressum, etc.)
// ============================================
const Impressum = () => (
  <div style={{ 
    minHeight: '100vh', 
    background: '#0b1120', 
    color: '#fff', 
    padding: '120px 24px 60px' 
  }}>
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <a href="/" style={{ color: '#6366f1', textDecoration: 'none', marginBottom: 24, display: 'inline-block' }}>
        ← Zurück zur Startseite
      </a>
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        TrapMap<br />
        [Deine Firma]<br />
        [Straße Nr.]<br />
        [PLZ Stadt]
      </p>
      <h2>Kontakt</h2>
      <p>
        Telefon: [Telefonnummer]<br />
        E-Mail: info@trap-map.de
      </p>
      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>
        [Name]<br />
        [Adresse]
      </p>
    </div>
  </div>
);

const Datenschutz = () => (
  <div style={{ 
    minHeight: '100vh', 
    background: '#0b1120', 
    color: '#fff', 
    padding: '120px 24px 60px' 
  }}>
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <a href="/" style={{ color: '#6366f1', textDecoration: 'none', marginBottom: 24, display: 'inline-block' }}>
        ← Zurück zur Startseite
      </a>
      <h1>Datenschutzerklärung</h1>
      <h2>1. Datenschutz auf einen Blick</h2>
      <h3>Allgemeine Hinweise</h3>
      <p>
        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren 
        personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
      </p>
      <h2>2. Hosting</h2>
      <p>
        Wir hosten die Inhalte unserer Website bei Render (render.com).
      </p>
      <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>
      <h3>Datenschutz</h3>
      <p>
        Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
      </p>
      {/* Hier vollständige Datenschutzerklärung einfügen */}
    </div>
  </div>
);

const AGB = () => (
  <div style={{ 
    minHeight: '100vh', 
    background: '#0b1120', 
    color: '#fff', 
    padding: '120px 24px 60px' 
  }}>
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <a href="/" style={{ color: '#6366f1', textDecoration: 'none', marginBottom: 24, display: 'inline-block' }}>
        ← Zurück zur Startseite
      </a>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen 
        TrapMap und dem Kunden.
      </p>
      <h2>§ 2 Vertragsgegenstand</h2>
      <p>
        Gegenstand des Vertrages ist die Bereitstellung der TrapMap Software zur 
        digitalen Dokumentation von Schädlingsmonitoring.
      </p>
      {/* Hier vollständige AGB einfügen */}
    </div>
  </div>
);

// ============================================
// PARTNER CHECK - VOR useAuth!
// ============================================
function isPartnerLoggedIn() {
  const userType = localStorage.getItem("trapmap_user_type");
  const partnerData = localStorage.getItem("trapmap_partner");
  const token = localStorage.getItem("trapmap_token");
  return userType === "partner" && partnerData && token;
}

// ============================================
// PARTNER APP (komplett separater Render)
// ============================================
function PartnerApp() {
  return (
    <ThemeProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
          <Route path="/partner/login" element={<Navigate to="/partner/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

// ============================================
// HAUPT APP
// ============================================
export default function App() {
  // WICHTIG: Partner-Check ZUERST, vor useAuth!
  if (isPartnerLoggedIn()) {
    return <PartnerApp />;
  }

  // Normale App mit useAuth
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

// ============================================
// MAIN APP (für normale User)
// ============================================
function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  // ============================================
  // NICHT EINGELOGGT - Public Pages zeigen
  // ============================================
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/partner/login" element={<PartnerLogin />} />
          
          {/* Statische Seiten */}
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/agb" element={<AGB />} />
          
          {/* QR-Code Direct Links - auch ohne Login erreichbar */}
          <Route path="/s/:code" element={<QRRedirect />} />
          
          {/* Alles andere → Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // ============================================
  // EINGELOGGT - Dashboard zeigen
  // ============================================
  const isSuperAdmin = SUPER_ADMINS.includes(user.email);

  // Gemeinsame Routes
  const CommonRoutes = (
    <>
      {/* QR Routes */}
      <Route path="/s/:code" element={<QRRedirect />} />
      <Route path="/qr/scanner" element={<DashboardLayout><Scanner /></DashboardLayout>} />
      <Route path="/qr/assign/:code" element={<DashboardLayout><AssignCode /></DashboardLayout>} />
      <Route path="/qr/assign-object/:code" element={<DashboardLayout><AssignObject /></DashboardLayout>} />
      
      {/* Other common routes */}
      <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
      <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
      <Route path="/boxes" element={<DashboardLayout><BoxPool /></DashboardLayout>} />
      {isSuperAdmin && (
        <Route path="/admin/*" element={<DashboardLayout><Admin /></DashboardLayout>} />
      )}
    </>
  );

  return (
    <Routes>
      {/* Public Pages auch wenn eingeloggt erreichbar */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/impressum" element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="/agb" element={<AGB />} />
      
      {/* Partner-Login auch wenn eingeloggt erreichbar */}
      <Route path="/partner/login" element={
        <Suspense fallback={<LoadingFallback />}>
          <PartnerLogin />
        </Suspense>
      } />

      {/* Login redirect wenn schon eingeloggt */}
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      {["admin", "supervisor"].includes(user.role) && (
        <>
          {CommonRoutes}
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/objects" element={<DashboardLayout><ObjectList /></DashboardLayout>} />
          <Route path="/objects/new" element={<DashboardLayout><ObjectCreate /></DashboardLayout>} />
          <Route path="/objects/:id" element={<DashboardLayout><ObjectDetails /></DashboardLayout>} />
          <Route path="/layouts" element={<DashboardLayout><LayoutList /></DashboardLayout>} />
          <Route path="/layouts/new" element={<DashboardLayout><LayoutCreate /></DashboardLayout>} />
          <Route path="/layouts/:id" element={<DashboardLayout><LayoutEditor /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
          <Route path="/technicians" element={<DashboardLayout><div className="p-8 text-white">Techniker-Verwaltung (coming soon)</div></DashboardLayout>} />
        </>
      )}

      {user.role === "technician" && (
        <>
          {CommonRoutes}
          <Route path="/dashboard" element={<DashboardLayout><TechnicianHome /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
        </>
      )}

      {["auditor", "viewer", "partner"].includes(user.role) && (
        <>
          {CommonRoutes}
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/objects" element={<DashboardLayout><ObjectList /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
        </>
      )}

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}