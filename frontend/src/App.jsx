/* ============================================================
   TRAPMAP - APP.JSX
   Mit ThemeProvider für Dark/Light Mode
   ============================================================ */

import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./components/layout/DashboardLayout";

// Login
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
  // NICHT EINGELOGGT - Login-Seiten zeigen
  // ============================================
  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* QR-Code Direct Links - auch ohne Login erreichbar */}
          <Route path="/s/:code" element={<QRRedirect />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/partner/login" element={<PartnerLogin />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // ============================================
  // NORMALER USER - Dashboard zeigen
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
        <Route path="/admin" element={<DashboardLayout><Admin /></DashboardLayout>} />
      )}
    </>
  );

  return (
    <Routes>
      {/* Partner-Login auch wenn eingeloggt erreichbar */}
      <Route path="/partner/login" element={
        <Suspense fallback={<LoadingFallback />}>
          <PartnerLogin />
        </Suspense>
      } />

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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      )}

      {user.role === "technician" && (
        <>
          {CommonRoutes}
          <Route path="/dashboard" element={<DashboardLayout><TechnicianHome /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      )}

      {["auditor", "viewer", "partner"].includes(user.role) && (
        <>
          {CommonRoutes}
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/objects" element={<DashboardLayout><ObjectList /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}