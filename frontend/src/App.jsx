import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

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
import Settings from "./pages/settings/Settings";
import Reports from "./pages/reports/Reports";
import Admin from "./pages/admin/Admin";
import BoxPool from "./pages/boxes/BoxPool";

// Super-Admin E-Mails
const SUPER_ADMINS = ["admin@demo.trapmap.de", "merlin@trapmap.de", "hilfe@die-schaedlingsexperten.de"];

// Loading Fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
    Laden...
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
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        <Route path="/partner/login" element={<Navigate to="/partner/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
      </Routes>
    </Suspense>
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
  return <MainApp />;
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
      <Route path="/qr/scanner" element={<DashboardLayout><Scanner /></DashboardLayout>} />
      <Route path="/qr/assign/:code" element={<DashboardLayout><AssignCode /></DashboardLayout>} />
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