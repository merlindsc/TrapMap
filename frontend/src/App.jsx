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
import Reports from "./pages/reports/Reports";
import Admin from "./pages/admin/Admin";

// Super-Admin E-Mails
const SUPER_ADMINS = ["admin@demo.trapmap.de", "merlin@trapmap.de"];

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

  const isSuperAdmin = SUPER_ADMINS.includes(user.email);

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
    <Routes>
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