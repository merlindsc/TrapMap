import React from "react";

export default function ThemeModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    // Theme-aware Modal
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      <div className="relative bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-theme">
        <div className="sticky top-0 bg-card border-b border-theme px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}