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
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

// Super-Admin E-Mails
const SUPER_ADMINS = [
  "admin@demo.trapmap.de",
  "merlin@trapmap.de",
  "hilfe@die-schaedlingsexperten.de"
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isSuperAdmin = user && SUPER_ADMINS.includes(user.email);

  // Holt NavigationseintrÃ¤ge basierend auf Rolle
  const getNavigationItems = () => {
    const role = user?.role;

    const items = [];

    // Admin
    if (role === "admin") {
      items.push(
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'Techniker', path: '/technicians', icon: UsersIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      );
      
      // Super-Admin Link hinzufÃ¼gen
      if (isSuperAdmin) {
        items.push({ name: 'Admin', path: '/admin', icon: ShieldCheckIcon });
      }
      
      return items;
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
        <Link to="/dashboard" className="sidebar-brand">
          <h1>TrapMap</h1>
        </Link>

        {user && (
          <div className="sidebar-user-info">
            <div className="user-role-badge">
              {user.role === 'admin' && (isSuperAdmin ? 'âš¡ Super-Admin' : 'ðŸ‘‘ Admin')}
              {user.role === 'supervisor' && 'â­ Supervisor'}
              {user.role === 'technician' && 'ðŸ”§ Techniker'}
              {user.role === 'auditor' && 'ðŸ“‹ Auditor'}
              {user.role === 'viewer' && 'ðŸ‘ï¸ Kunde'}
              {user.role === 'partner' && 'ðŸ¤ Partner'}
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
            title={item.description}
          >
            <item.icon className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">{item.name}</span>
            {item.badge && (
              <span className="sidebar-nav-badge">{item.badge}</span>
            )}
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