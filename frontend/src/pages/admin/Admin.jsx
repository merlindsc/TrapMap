/* ============================================================
   TRAPMAP – ADMIN.JSX (Super-Admin Dashboard)
   Mit integriertem QR-Order System
   ============================================================ */

import React, { useState, useEffect } from "react";
import {
  Users, Building2, Settings, QrCode, Shield, 
  ChevronRight, AlertTriangle
} from "lucide-react";

// Import der Sub-Komponenten
import SuperAdminQROrders from "./SuperAdminQROrders";
// Falls du die anderen Admin-Komponenten hast:
// import SuperAdminUsers from "./SuperAdminUsers";
// import SuperAdminOrganisations from "./SuperAdminOrganisations";

const API = import.meta.env.VITE_API_URL;

// Super-Admin E-Mails
const SUPER_ADMINS = [
  "admin@demo.trapmap.de",
  "merlin@trapmap.de",
  "hilfe@die-schaedlingsexperten.de"
];

export default function Admin() {
  const token = localStorage.getItem("trapmap_token");
  const user = JSON.parse(localStorage.getItem("trapmap_user") || "{}");
  
  const [activeTab, setActiveTab] = useState("qr-orders"); // Default: QR-Orders
  const [stats, setStats] = useState(null);

  // Check Super-Admin Status
  const isSuperAdmin = SUPER_ADMINS.includes(user.email);

  useEffect(() => {
    if (isSuperAdmin) {
      loadStats();
    }
  }, []);

  const loadStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Lade verschiedene Stats
      const [orgsRes, usersRes] = await Promise.all([
        fetch(`${API}/qr-orders/stats`, { headers }),
        fetch(`${API}/users`, { headers })
      ]);

      const orgs = orgsRes.ok ? await orgsRes.json() : [];
      const users = usersRes.ok ? await usersRes.json() : [];

      setStats({
        organisations: Array.isArray(orgs) ? orgs.length : 0,
        users: Array.isArray(users) ? users.length : (users.data?.length || 0),
        totalQRCodes: Array.isArray(orgs) 
          ? orgs.reduce((sum, o) => sum + (o.qr_codes_ordered || 0), 0) 
          : 0
      });
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  // Kein Super-Admin → Kein Zugang
  if (!isSuperAdmin) {
    return (
      <div style={styles.accessDenied}>
        <AlertTriangle size={64} color="#ef4444" />
        <h1>Zugang verweigert</h1>
        <p>Du hast keine Super-Admin Berechtigung.</p>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          Eingeloggt als: {user.email}
        </p>
      </div>
    );
  }

  // ============================================
  // TABS
  // ============================================
  const tabs = [
    { 
      id: "qr-orders", 
      label: "QR-Codes", 
      icon: QrCode,
      description: "QR-Code Bestellungen & Versand"
    },
    { 
      id: "organisations", 
      label: "Organisationen", 
      icon: Building2,
      description: "Alle Organisationen verwalten"
    },
    { 
      id: "users", 
      label: "Benutzer", 
      icon: Users,
      description: "Alle Benutzer verwalten"
    },
    { 
      id: "settings", 
      label: "System", 
      icon: Settings,
      description: "Systemeinstellungen"
    }
  ];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <Shield size={32} color="#6366f1" />
          <div>
            <h1 style={styles.title}>Super-Admin Dashboard</h1>
            <p style={styles.subtitle}>TrapMap Systemverwaltung</p>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div style={styles.quickStats}>
            <div style={styles.quickStat}>
              <span>{stats.organisations}</span>
              <small>Organisationen</small>
            </div>
            <div style={styles.quickStat}>
              <span>{stats.users}</span>
              <small>Benutzer</small>
            </div>
            <div style={styles.quickStat}>
              <span>{stats.totalQRCodes}</span>
              <small>QR-Codes</small>
            </div>
          </div>
        )}
      </div>

      {/* TAB NAVIGATION */}
      <div style={styles.tabNav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tabButton,
              background: activeTab === tab.id ? "#6366f1" : "transparent",
              borderColor: activeTab === tab.id ? "#6366f1" : "#374151"
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div style={styles.content}>
        {activeTab === "qr-orders" && (
          <SuperAdminQROrders />
        )}

        {activeTab === "organisations" && (
          <div style={styles.placeholder}>
            <Building2 size={48} />
            <h2>Organisationen</h2>
            <p>Hier werden alle Organisationen verwaltet.</p>
            {/* <SuperAdminOrganisations /> */}
          </div>
        )}

        {activeTab === "users" && (
          <div style={styles.placeholder}>
            <Users size={48} />
            <h2>Benutzer</h2>
            <p>Hier werden alle Benutzer verwaltet.</p>
            {/* <SuperAdminUsers /> */}
          </div>
        )}

        {activeTab === "settings" && (
          <div style={styles.placeholder}>
            <Settings size={48} />
            <h2>Systemeinstellungen</h2>
            <p>Globale Konfiguration und Einstellungen.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#fff"
  },
  accessDenied: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center",
    padding: "20px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    padding: "24px",
    background: "#1e293b",
    borderBottom: "1px solid #334155"
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: 0
  },
  subtitle: {
    color: "#9ca3af",
    margin: 0
  },
  quickStats: {
    display: "flex",
    gap: "24px"
  },
  quickStat: {
    textAlign: "center"
  },
  tabNav: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
    background: "#1e293b",
    overflowX: "auto"
  },
  tabButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    background: "transparent",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  },
  content: {
    padding: "0"
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
    textAlign: "center",
    color: "#6b7280"
  }
};