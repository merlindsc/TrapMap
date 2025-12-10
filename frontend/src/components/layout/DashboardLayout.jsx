import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const closeSidebar = () => {
    console.log("Closing sidebar");
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    console.log("Opening sidebar");
    setSidebarOpen(true);
  };

  return (
    <div className="flex bg-[#0b1120] text-white min-h-screen relative">
      
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 40,
            cursor: 'pointer'
          }}
        />
      )}

      {/* Sidebar Container */}
      <div 
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <Sidebar 
          activePath={pathname} 
          isMobile={isMobile}
          onClose={closeSidebar}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">

        {/* Mobile Header with Hamburger */}
        {isMobile && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: '#1a1f3a',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <button
              onClick={openSidebar}
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Bars3Icon style={{ width: '24px', height: '24px', color: 'white' }} />
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>TrapMap</h1>
            <div style={{ width: '40px' }} />
          </div>
        )}

        {/* Navbar (Desktop only) */}
        {!isMobile && <Navbar />}

        {/* Hauptinhalt */}
        <main className="p-4 md:p-8 overflow-y-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}