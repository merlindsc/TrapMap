/* ============================================================
   TRAPMAP - APP.JSX
   Mit ThemeProvider, Landing Page, Legal Pages & Cookie Consent
   ============================================================ */

import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./components/layout/DashboardLayout";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import VerifyDemo from "./pages/public/VerifyDemo";
import Login from "./pages/Login";

// Legal Pages
import Impressum from "./pages/legal/Impressum";
import Datenschutz from "./pages/legal/Datenschutz";
import AGB from "./pages/legal/AGB";

// Cookie Consent
import CookieConsent from "./components/CookieConsent";
import UpdatesWidget from "./components/UpdatesWidget";
import FeedbackWidget from "./components/FeedbackWidget";

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
// PARTNER CHECK - VOR useAuth!
// ============================================
function isPartnerLoggedIn() {
  try {
    const userType = localStorage.getItem("trapmap_user_type");
    const partnerData = localStorage.getItem("trapmap_partner");
    const token = localStorage.getItem("trapmap_token");
    return userType === "partner" && partnerData && token;
  } catch (error) {
    // localStorage nicht verfügbar (z.B. Inkognito-Modus)
    console.warn("localStorage nicht verfügbar:", error);
    return false;
  }
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
      <CookieConsent />
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
      <CookieConsent />
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
          
          {/* Demo Verification */}
          <Route path="/verify-demo" element={<VerifyDemo />} />
          
          {/* Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/partner/login" element={<PartnerLogin />} />
          
          {/* Legal Pages */}
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

      {/* ========================================
          GEMEINSAME ROUTES FÜR ALLE ROLLEN
          ======================================== */}
      <Route path="/s/:code" element={<QRRedirect />} />
      <Route path="/qr/scanner" element={<DashboardLayout><Scanner /></DashboardLayout>} />
      <Route path="/qr/assign-code" element={<DashboardLayout><AssignCode /></DashboardLayout>} />
      <Route path="/qr/assign-object" element={<DashboardLayout><AssignObject /></DashboardLayout>} />
      <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
      <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
      <Route path="/boxes" element={<DashboardLayout><BoxPool /></DashboardLayout>} />
      
      {/* Super-Admin Route */}
      {isSuperAdmin && (
        <Route path="/admin/*" element={<DashboardLayout><Admin /></DashboardLayout>} />
      )}

      {/* ========================================
          ADMIN / SUPERVISOR ROUTES
          ======================================== */}
      {["admin", "supervisor"].includes(user.role) && (
        <>
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/objects" element={<DashboardLayout><ObjectList /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/objects/new" element={<DashboardLayout><ObjectCreate /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/objects/:id" element={<DashboardLayout><ObjectDetails /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/layouts" element={<DashboardLayout><LayoutList /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/layouts/new" element={<DashboardLayout><LayoutCreate /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/layouts/:id" element={<DashboardLayout><LayoutEditor /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/technicians" element={<DashboardLayout><div className="p-8 text-white">Techniker-Verwaltung (coming soon)</div><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
        </>
      )}

      {/* ========================================
          TECHNIKER ROUTES
          ======================================== */}
      {user.role === "technician" && (
        <>
          <Route path="/dashboard" element={<DashboardLayout><TechnicianHome /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
        </>
      )}

      {/* ========================================
          AUDITOR / VIEWER / PARTNER ROUTES
          ======================================== */}
      {["auditor", "viewer", "partner"].includes(user.role) && (
        <>
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/objects" element={<DashboardLayout><ObjectList /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /><UpdatesWidget /><FeedbackWidget /></DashboardLayout>} />
        </>
      )}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}