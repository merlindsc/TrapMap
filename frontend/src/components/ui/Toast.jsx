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
    success: <CheckCircle size={20} className="text-green-400" />,
    error: <AlertCircle size={20} className="text-red-400" />,
    info: <Info size={20} className="text-blue-400" />,
  };

  const bgColors = {
    success: "bg-green-900 border-green-700",
    error: "bg-red-900 border-red-700",
    info: "bg-blue-900 border-blue-700",
  };

  return (
    <div
      className={`fixed top-20 right-4 z-[100000] ${bgColors[type]} border rounded-lg p-4 shadow-xl max-w-md animate-slide-in`}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <p className="text-white flex-1">{message}</p>
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