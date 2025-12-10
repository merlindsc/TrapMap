import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
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
  }, [pathname, isMobile]);

  return (
    <div className="flex bg-[#0b1120] text-white min-h-screen relative">
      
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activePath={pathname} 
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">

        {/* Mobile Header with Hamburger */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 bg-[#1a1f3a] border-b border-white/10 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Bars3Icon className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">TrapMap</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        )}

        {/* Navbar (Desktop) */}
        <div className="hidden md:block">
          <Navbar />
        </div>

        {/* Hauptinhalt */}
        <main className="p-4 md:p-8 overflow-y-auto h-full flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}