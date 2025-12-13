/* ============================================================
   TRAPMAP - NAVBAR V2
   Mit Dark/Light Mode Support
   ============================================================ */

import { LogOut, User, Bell } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">
          <span className="title-trap">Trap</span>
          <span className="title-map">Map</span>
          <span className="title-dashboard">Dashboard</span>
        </h1>
      </div>

      <div className="navbar-right">
        {/* Notifications (optional) */}
        <button className="navbar-icon-btn" title="Benachrichtigungen">
          <Bell className="navbar-icon" />
        </button>

        {/* User */}
        {user && (
          <div className="navbar-user">
            <div className="user-avatar">
              {user.first_name?.[0] || user.email?.[0] || 'U'}
            </div>
            <span className="user-name">
              {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email?.split('@')[0]}
            </span>
          </div>
        )}

        {/* Logout */}
        <button onClick={logout} className="logout-btn">
          <LogOut className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}