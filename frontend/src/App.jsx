import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/auth/Login";
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

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-900 text-white">
        Loading TrapMap...
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const QRRoutes = (
    <>
      <Route path="/qr/scanner" element={<DashboardLayout><Scanner /></DashboardLayout>} />
      <Route path="/qr/assign/:code" element={<DashboardLayout><AssignCode /></DashboardLayout>} />
    </>
  );

  // Settings Route für alle Rollen
  const SettingsRoute = (
    <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
  );

  return (
    <Routes>
      {["admin", "supervisor"].includes(user.role) && (
        <>
          {QRRoutes}
          {SettingsRoute}
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
          {QRRoutes}
          {SettingsRoute}
          <Route path="/dashboard" element={<DashboardLayout><TechnicianHome /></DashboardLayout>} />
          <Route path="/maps" element={<DashboardLayout><Maps /></DashboardLayout>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      )}

      {["auditor", "viewer", "partner"].includes(user.role) && (
        <>
          {QRRoutes}
          {SettingsRoute}
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