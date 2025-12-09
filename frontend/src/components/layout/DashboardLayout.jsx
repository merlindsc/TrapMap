import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="flex bg-[#0b1120] text-white min-h-screen">
      
      {/* Sidebar erhält Information über die aktuelle Route */}
      <Sidebar activePath={pathname} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Navbar */}
        <Navbar />

        {/* Hauptinhalt */}
        <main className="p-8 overflow-y-auto h-full">
          {children}
        </main>
      </div>
    </div>
  );
}
