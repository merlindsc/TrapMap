/* ============================================================
   TRAPMAP - SIDEBAR (FINAL VERSION)
   Mit funktionierendem Theme-Toggle und Logo
   ============================================================ */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from './DashboardLayout';
import './Sidebar.css';
import trapMapLogo from '../../assets/trapmap-logo-200.png';

import {
  HomeIcon,
  BuildingOfficeIcon,
  ArchiveBoxIcon,
  UsersIcon,
  CogIcon,
  QrCodeIcon,
  MapIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  InboxArrowDownIcon
} from '@heroicons/react/24/outline';

const SUPER_ADMINS = [
  "admin@demo.trapmap.de",
  "merlin@trapmap.de",
  "hilfe@die-schaedlingsexperten.de"
];

export default function Sidebar({ isMobile, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isSuperAdmin = user && SUPER_ADMINS.includes(user.email);

  const getNavigationItems = () => {
    const role = user?.role;

    if (role === "admin") {
      const items = [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'Techniker', path: '/technicians', icon: UsersIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'Archiv', path: '/archive', icon: InboxArrowDownIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      ];
      if (isSuperAdmin) {
        items.push({ name: 'Admin', path: '/admin', icon: ShieldCheckIcon });
      }
      return items;
    }

    if (role === "supervisor") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'Archiv', path: '/archive', icon: InboxArrowDownIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      ];
    }

    if (role === "technician") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Einstellungen', path: '/settings', icon: CogIcon }
      ];
    }

    if (role === "auditor") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon }
      ];
    }

    if (role === "viewer") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Objekte', path: '/objects', icon: BuildingOfficeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon }
      ];
    }

    if (role === "partner") {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
        { name: 'Maps', path: '/maps', icon: MapIcon },
        { name: 'QR-Scanner', path: '/qr/scanner', icon: QrCodeIcon },
        { name: 'Boxen', path: '/boxes', icon: ArchiveBoxIcon },
        { name: 'Reports', path: '/reports', icon: DocumentTextIcon }
      ];
    }

    return [{ name: 'Dashboard', path: '/dashboard', icon: HomeIcon }];
  };

  const navigationItems = getNavigationItems();

  const getRoleBadge = () => {
    if (user?.role === 'admin') return isSuperAdmin ? 'Super-Admin' : 'Admin';
    if (user?.role === 'supervisor') return 'Supervisor';
    if (user?.role === 'technician') return 'Techniker';
    if (user?.role === 'auditor') return 'Auditor';
    if (user?.role === 'viewer') return 'Kunde';
    if (user?.role === 'partner') return 'Partner';
    return user?.role || '';
  };

  const getBadgeClass = () => {
    if (user?.role === 'admin' && isSuperAdmin) return 'badge-super-admin';
    if (user?.role === 'admin') return 'badge-admin';
    if (user?.role === 'supervisor') return 'badge-supervisor';
    if (user?.role === 'technician') return 'badge-technician';
    return 'badge-default';
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <Link to="/dashboard" className="sidebar-brand">
            <img src={trapMapLogo} alt="TrapMap" className="sidebar-logo-img" />
          </Link>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={onClose}>
              <XMarkIcon style={{ width: 24, height: 24 }} />
            </button>
          )}
        </div>

        {user && (
          <div className="sidebar-user-info">
            <div className={`user-role-badge ${getBadgeClass()}`}>
              {getRoleBadge()}
            </div>
          </div>
        )}

        <button className="theme-toggle-header" onClick={toggleTheme}>
          {theme === 'light' ? <MoonIcon className="sidebar-nav-icon" /> : <SunIcon className="sidebar-nav-icon" />}
          <span>{theme === 'light' ? 'Dunkel' : 'Hell'} aktivieren</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={isMobile ? onClose : undefined}
          >
            <item.icon className="sidebar-nav-icon" />
            <span className="sidebar-nav-text">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user-details">
            <div className="user-name">{user.name || user.email?.split('@')[0]}</div>
            <div className="user-email">{user.email}</div>
          </div>
        )}
      </div>
    </div>
  );
}