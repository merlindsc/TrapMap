/* ============================================================
   TRAPMAP - DASHBOARD LAYOUT (FIXED VERSION)
   - Dark/Light Mode mit CSS-Variablen (KEIN hardcoded!)
   - Moderne Sidebar mit Logo
   - Mobile-optimiert
   ============================================================ */

import React, { useState, useEffect, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Bars3Icon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import "./DashboardLayout.css";
import trapMapLogo from "../../assets/trapmap-logo-150.png";

// ============================================================
// THEME CONTEXT
// ============================================================
const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {}
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("trapmap_theme");
    return saved || "dark";
  });

  useEffect(() => {
    // CSS-Variablen direkt auf :root setzen
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#f8fafc');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.03)');
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.07)');
      root.style.setProperty('--shadow-lg', '0 10px 25px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)');
      root.style.setProperty('--sidebar-text', '#64748b');
      root.style.setProperty('--sidebar-text-hover', '#1e293b');
      root.style.setProperty('--sidebar-item-hover', 'rgba(0, 0, 0, 0.04)');
      root.style.setProperty('--sidebar-footer-bg', 'rgba(0, 0, 0, 0.03)');
    } else {
      root.style.setProperty('--bg-primary', '#0b1120');
      root.style.setProperty('--bg-secondary', '#111827');
      root.style.setProperty('--bg-card', '#1f2937');
      root.style.setProperty('--bg-hover', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-lg', '0 10px 25px rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #1a1f3a 0%, #0f1419 100%)');
      root.style.setProperty('--sidebar-text', '#94a3b8');
      root.style.setProperty('--sidebar-text-hover', '#ffffff');
      root.style.setProperty('--sidebar-item-hover', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--sidebar-footer-bg', 'rgba(0, 0, 0, 0.2)');
    }
    
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("trapmap_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================
// DASHBOARD LAYOUT - MIT CSS VARIABLEN!
// ============================================================
export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar-container ${isMobile ? 'mobile' : ''} ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar 
          activePath={pathname} 
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main Content */}
      <div className="main-container">
        {/* Mobile Header mit Logo */}
        {isMobile && (
          <header className="mobile-header">
            <button 
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Menu öffnen"
            >
              <Bars3Icon className="hamburger-icon" />
            </button>
            <img src={trapMapLogo} alt="TrapMap" className="mobile-header-logo" />
            <button 
              className="mobile-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
            >
              {theme === 'dark' ? (
                <SunIcon className="theme-icon" />
              ) : (
                <MoonIcon className="theme-icon" />
              )}
            </button>
          </header>
        )}

        {/* Desktop Navbar mit Logo */}
        {!isMobile && (
          <header className="desktop-navbar">
            <div className="navbar-left">
              <img src={trapMapLogo} alt="TrapMap" className="navbar-logo" />
              <span className="title-dashboard">Dashboard</span>
            </div>

            <div className="navbar-right">
              {user && (
                <div className="navbar-user">
                  <div className="user-avatar">
                    {user.first_name?.[0] || user.email?.[0] || 'U'}
                  </div>
                  <span className="user-name-text">
                    {user.first_name || user.email?.split('@')[0]}
                  </span>
                </div>
              )}

              <button className="logout-btn" onClick={logout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}