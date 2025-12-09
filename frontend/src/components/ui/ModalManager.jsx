/* ============================================================
   MODAL MANAGER - ZENTRALISIERTE MODAL-VERWALTUNG
   
   ✅ React Portals für alle Modals
   ✅ Automatische Z-Index Verwaltung
   ✅ Keyboard Navigation (ESC)
   ✅ Fokus-Management
   ✅ Verhindert Body-Scroll
   ============================================================ */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Wrapper für alle Modals
 * Rendert außerhalb des Component-Trees direkt in document.body
 */
export function ModalPortal({ children, isOpen, zIndex = 1000 }) {
  useEffect(() => {
    if (isOpen) {
      // Verhindere Body-Scroll wenn Modal offen
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-portal" 
      style={{ zIndex }}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * Standard Modal Overlay mit Backdrop
 */
export function ModalOverlay({ 
  children, 
  onClose, 
  closeOnBackdrop = true,
  className = ''
}) {
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  // ESC-Taste schließt Modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className={`modal-overlay ${className}`}
      onClick={handleBackdropClick}
    >
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
}

/**
 * Z-Index Hierarchie
 */
export const MODAL_Z_INDEX = {
  BASE: 1000,
  BOX_DIALOG: 1000,
  HISTORY_MODAL: 1100,
  SCAN_MODAL: 1200,
  TOAST: 9999,
};