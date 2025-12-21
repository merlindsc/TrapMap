/* ============================================================
   TOAST NOTIFICATION COMPONENT
   ============================================================ */

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  /* Use custom CSS variables to support Theme switching (Light/Dark) */
  const bgColors = {
    success: {
      background: 'var(--bg-toast-success)',
      borderColor: 'var(--border-toast-success)',
      color: 'var(--text-toast-success)'
    },
    error: {
      background: 'var(--bg-toast-error)',
      borderColor: 'var(--border-toast-error)',
      color: 'var(--text-toast-error)'
    },
    info: {
      background: 'var(--bg-toast-info)',
      borderColor: 'var(--border-toast-info)',
      color: 'var(--text-toast-info)'
    },
  };

  const currentStyle = bgColors[type] || bgColors.info;


  return (
    <div
      className={`fixed top-20 right-4 z-[100000] border rounded-lg p-4 shadow-xl max-w-md animate-slide-in`}
      style={{
        background: currentStyle.background,
        borderColor: currentStyle.borderColor,
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ color: currentStyle.color }}>{icons[type]}</div>
        <p className="flex-1" style={{ color: currentStyle.color }}>{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}