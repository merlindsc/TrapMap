import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

import {
  HomeIcon,
  BuildingOfficeIcon,
  ArchiveBoxIcon,
  UsersIcon,
  CogIcon,
  QrCodeIcon,
  MapIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ isMobile, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("X button clicked");
    if (onClose) {
      onClose();
    }
  };

  // Navigationseinträge basierend auf Rolle
  const getNavigationItems = () => {
    const role = user?.role;

    // Admin
    if (role === "admin") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'Techniker', path: '/technicians', icon: UsersIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      ];
    }

    // Supervisor
    if (role === "supervisor") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'Scans', path: '/scans', icon: QrCodeIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      ];
    }

    // Techniker
    if (role === "technician") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Scans', path: '/scans', icon: QrCodeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      ];
    }

    // Auditor
    if (role === "auditor") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon }
      ];
    }

    // Viewer / Kunde
    if (role === "viewer") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon }
      ];
    }

    // Partnerfirma
    if (role === "partner") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Scans', path: '/scans', icon: QrCodeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon }
      ];
    }

    // Fallback
    return [
      { name: 'Dashboard', path: '/dashboard', icon: HomeIcon }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="sidebar">
      
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <Link to="/dashboard" className="sidebar-brand" onClick={handleNavClick}>
            <h1>TrapMap</h1>
          </Link>
          
          {/* Close Button (Mobile only) */}
          {isMobile && (
            <button 
              onClick={handleClose}
              className="sidebar-close-btn"
              type="button"
              aria-label="Menü schließen"
            >
              <XMarkIcon style={{ width: '24px', height: '24px' }} />
            </button>
          )}
        </div>

        {user && (
          <div className="sidebar-user-info">
            <div className="user-role-badge">
              {user.role === 'admin' && '👑 Admin'}
              {user.role === 'supervisor' && '⭐ Supervisor'}
              {user.role === 'technician' && '🔧 Techniker'}
              {user.role === 'auditor' && '📋 Auditor'}
              {user.role === 'viewer' && '👁️ Kunde'}
              {user.role === 'partner' && '🤝 Partner'}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={handleNavClick}
          >
            <item.icon className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user-details">
            <div className="user-name">{user.name || user.email}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;