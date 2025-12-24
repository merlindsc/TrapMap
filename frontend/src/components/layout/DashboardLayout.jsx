/* ============================================================
   TRAPMAP - DASHBOARD LAYOUT (FIXED VERSION)
   - Dark/Light Mode mit CSS-Variablen (KEIN hardcoded!)
   - Moderne Sidebar mit Logo
   - Mobile-optimiert
   ============================================================ */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Bars3Icon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { LogOut, Plus, Satellite } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useMapControls } from "../../context/MapControlsContext";
import { useTheme } from "../../hooks/useTheme";
import Modal from "../ui/ThemeModal";
import "./DashboardLayout.css";
import ChatWidget from "../ChatWidget";
import trapMapLogo from "../../assets/trapmap-logo-200.png";

// ============================================================
// DASHBOARD LAYOUT - Theme wird über ThemeContext verwaltet
// ============================================================
export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { mapStyle, setMapStyle, objectPlacingMode, setObjectPlacingMode, isMapView } = useMapControls();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

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

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

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
            <div className="mobile-header-actions">
              {/* Map Controls - Only visible on Maps page */}
              {isMapView && (
                <>
                  {/* Object Create Button */}
                  <button 
                    className={`mobile-map-btn ${objectPlacingMode ? 'active' : ''}`}
                    onClick={() => setObjectPlacingMode(!objectPlacingMode)}
                    aria-label="Objekt erstellen"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: objectPlacingMode ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: objectPlacingMode ? '#fff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={20} />
                  </button>

                  {/* Satellite Toggle Button */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      className="mobile-map-btn"
                      onClick={() => setStyleOpen(!styleOpen)}
                      aria-label="Karten-Stil"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Satellite size={20} />
                    </button>
                    
                    {styleOpen && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '6px',
                          minWidth: '140px',
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 1000
                        }}
                      >
                        <button 
                          onClick={() => { setMapStyle("streets"); setStyleOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: mapStyle === "streets" ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: mapStyle === "streets" ? '#6366f1' : 'var(--text-primary)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🗺️ Straßen
                        </button>
                        <button 
                          onClick={() => { setMapStyle("satellite"); setStyleOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: mapStyle === "satellite" ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: mapStyle === "satellite" ? '#6366f1' : 'var(--text-primary)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🛰️ Satellit
                        </button>
                        <button 
                          onClick={() => { setMapStyle("hybrid"); setStyleOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: mapStyle === "hybrid" ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: mapStyle === "hybrid" ? '#6366f1' : 'var(--text-primary)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🌍 Hybrid
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
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
              <button 
                className="mobile-logout-btn"
                onClick={handleLogoutClick}
                aria-label="Abmelden"
              >
                <LogOut className="logout-icon" />
              </button>
            </div>
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
              {/* Map Controls - Only visible on Maps page */}
              {isMapView && (
                <>
                  {/* Object Create Button */}
                  <button 
                    className={`navbar-btn ${objectPlacingMode ? 'active' : ''}`}
                    onClick={() => setObjectPlacingMode(!objectPlacingMode)}
                    title="Neues Objekt erstellen"
                    style={{
                      background: objectPlacingMode ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: objectPlacingMode ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!objectPlacingMode) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!objectPlacingMode) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.target.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <Plus size={18} />
                    <span>Objekt</span>
                  </button>

                  {/* Satellite Toggle Button */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      className="navbar-btn"
                      onClick={() => setStyleOpen(!styleOpen)}
                      title="Karten-Stil wechseln"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.target.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <Satellite size={18} />
                      <span>Layer</span>
                    </button>
                    
                    {styleOpen && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '6px',
                          minWidth: '140px',
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 1000
                        }}
                      >
                        <button 
                          onClick={() => { setMapStyle("streets"); setStyleOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: mapStyle === "streets" ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: mapStyle === "streets" ? '#6366f1' : 'var(--text-primary)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => {
                            if (mapStyle !== "streets") {
                              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (mapStyle !== "streets") {
                              e.target.style.background = 'transparent';
                            }
                          }}
                        >
                          🗺️ Straßen
                        </button>
                        <button 
                          onClick={() => { setMapStyle("satellite"); setStyleOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: mapStyle === "satellite" ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: mapStyle === "satellite" ? '#6366f1' : 'var(--text-primary)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => {
                            if (mapStyle !== "satellite") {
                              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (mapStyle !== "satellite") {
                              e.target.style.background = 'transparent';
                            }
                          }}
                        >
                          🛰️ Satellit
                        </button>
                        <button 
                          onClick={() => { setMapStyle("hybrid"); setStyleOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: mapStyle === "hybrid" ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: mapStyle === "hybrid" ? '#6366f1' : 'var(--text-primary)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => {
                            if (mapStyle !== "hybrid") {
                              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (mapStyle !== "hybrid") {
                              e.target.style.background = 'transparent';
                            }
                          }}
                        >
                          🌍 Hybrid
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button className="theme-toggle-nav" onClick={toggleTheme} aria-label="Theme umschalten">
                {theme === "light" ? "🌙" : "☀️"}
              </button>
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

              <button className="logout-btn" onClick={handleLogoutClick}>
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

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={handleLogoutCancel}
        title="Logout bestätigen"
      >
        <div className="logout-confirm-content">
          <p className="logout-confirm-text">
            Möchten Sie sich wirklich abmelden?
          </p>
          <div className="logout-confirm-actions">
            <button 
              className="btn-cancel"
              onClick={handleLogoutCancel}
            >
              Abbrechen
            </button>
            <button 
              className="btn-confirm-logout"
              onClick={handleLogoutConfirm}
            >
              <LogOut size={16} />
              Abmelden
            </button>
          </div>
        </div>
      </Modal>
      {/* AI Support Chat */}
      <ChatWidget />
    </div>
  );
}