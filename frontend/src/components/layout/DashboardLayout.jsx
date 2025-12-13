/* ============================================================
   TRAPMAP - DASHBOARD LAYOUT (FINAL VERSION)
   - Dark/Light Mode mit funktionierendem Toggle
   - Moderne Sidebar
   - Mobile-optimiert
   ============================================================ */

import React, { useState, useEffect, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

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
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
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
// DASHBOARD LAYOUT
// ============================================================
export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
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
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0b1120',
      color: '#ffffff',
    }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 40,
          }} 
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        bottom: isMobile ? 0 : 'auto',
        zIndex: 50,
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
      }}>
        <Sidebar 
          activePath={pathname} 
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: '#0b1120',
      }}>
        {/* Mobile Header */}
        {isMobile && (
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#111827',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <button 
              onClick={() => setSidebarOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                background: '#1f2937',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <Bars3Icon style={{ width: 24, height: 24, color: '#fff' }} />
            </button>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              <span style={{ color: '#fff' }}>Trap</span>
              <span style={{ 
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Map</span>
            </div>
            <div style={{ width: 44 }} />
          </header>
        )}

        {/* Desktop Navbar */}
        {!isMobile && (
          <header style={{
            height: 64,
            background: '#111827',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
              <span style={{ color: '#fff' }}>Trap</span>
              <span style={{ 
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Map</span>
              <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 8 }}>Dashboard</span>
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 12px 6px 6px',
                  background: '#1f2937',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                  }}>
                    {user.first_name?.[0] || user.email?.[0] || 'U'}
                  </div>
                  <span style={{ color: '#fff', fontSize: 14 }}>
                    {user.first_name || user.email?.split('@')[0]}
                  </span>
                </div>
              )}

              <button 
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 10,
                  color: '#ef4444',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          background: '#0b1120',
          color: '#ffffff',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}