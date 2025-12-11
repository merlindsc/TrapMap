import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

// KORRIGIERTE PFADE für deine Struktur
import Login from "./pages/Login";  // ← Nicht ./pages/auth/Login!
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";

// Diese Imports musst du ggf. anpassen wenn die Pfade anders sind:
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

// Super-Admin E-Mails
const SUPER_ADMINS = ["admin@demo.trapmap.de", "merlin@trapmap.de", "hilfe@die-schaedlingsexperten.de"];

// ============================================
// PUBLIC SCAN COMPONENT (Inline)
// Für QR-Code Scans die /s/:code öffnen
// ============================================
function PublicScan() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!code) {
      navigate("/login");
      return;
    }

    if (!user) {
      // Nicht eingeloggt → Code speichern und zum Login
      sessionStorage.setItem("trapmap_pending_scan", code);
      navigate("/login");
    } else {
      // Eingeloggt → Zum Scanner mit dem Code
      navigate(`/qr/assign/${code}`);
    }
  }, [code, user, navigate]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px",
          height: "48px",
          border: "4px solid #6366f1",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px"
        }} />
        <p>Code wird verarbeitet...</p>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>{code}</p>
      </div>
    </div>
  );
}

// ============================================
// PENDING SCAN HANDLER
// Prüft nach Login ob ein QR-Scan aussteht
// ============================================
function PendingScanHandler({ children }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const pendingScan = sessionStorage.getItem("trapmap_pending_scan");
      if (pendingScan) {
        sessionStorage.removeItem("trapmap_pending_scan");
        navigate(`/qr/assign/${pendingScan}`);
      }
    }
  }, [user, navigate]);

  return children;
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
        Loading TrapMap...
      </div>
    );
  }

  const isSuperAdmin = user && SUPER_ADMINS.includes(user.email);

  // Gemeinsame Routes
  const CommonRoutes = (
    <>
      <Route path="/qr/scanner" element={<DashboardLayout><Scanner /></DashboardLayout>} />
      <Route path="/qr/assign/:code" element={<DashboardLayout><AssignCode /></DashboardLayout>} />
      <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
      <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
      {isSuperAdmin && (
        <Route path="/admin" element={<DashboardLayout><Admin /></DashboardLayout>} />
      )}
    </>
  );

  return (
    <PendingScanHandler>
      <Routes>
        
        {/* ÖFFENTLICHE ROUTES - Immer verfügbar */}
        <Route path="/s/:code" element={<PublicScan />} />
        <Route path="/scan/:code" element={<PublicScan />} />

        {/* LOGIN */}
        {!user && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {/* GESCHÜTZTE ROUTES */}
        {user && (
          <>
            {/* Admin & Supervisor */}
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

            {/* Technician */}
            {user.role === "technician" && (
              <>
                {CommonRoutes}
                <Route path="/dashboard" element={<DashboardLayout><TechnicianHome /></DashboardLayout>} />
                <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </>
            )}

            {/* Auditor, Viewer, Partner */}
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
          </>
        )}

      </Routes>
    </PendingScanHandler>
  );
}