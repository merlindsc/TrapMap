/* ============================================================
   TRAPMAP - THEME CONTEXT
   Dark/Light Mode Management
   ============================================================ */

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("trapmap_theme");
    return saved || "light";
  });

  useEffect(() => {
    // CSS-Variablen direkt auf :root setzen
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    
    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#f8fafc');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.03)');
      root.style.setProperty('--text-primary', '#1e293b');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.07)');
      root.style.setProperty('--shadow-lg', '0 10px 25px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)');
      root.style.setProperty('--sidebar-text', '#64748b');
      root.style.setProperty('--sidebar-text-hover', '#1e293b');
      root.style.setProperty('--sidebar-item-hover', 'rgba(0, 0, 0, 0.04)');
      root.style.setProperty('--sidebar-footer-bg', 'rgba(0, 0, 0, 0.03)');
    } else {
      root.style.setProperty('--bg-primary', '#0b1120');
      root.style.setProperty('--bg-secondary', '#111827');
      root.style.setProperty('--bg-card', '#1f2937');
      root.style.setProperty('--bg-hover', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-lg', '0 10px 25px rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #1a1f3a 0%, #0f1419 100%)');
      root.style.setProperty('--sidebar-text', '#94a3b8');
      root.style.setProperty('--sidebar-text-hover', '#ffffff');
      root.style.setProperty('--sidebar-item-hover', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--sidebar-footer-bg', 'rgba(0, 0, 0, 0.2)');
    }
    
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("trapmap_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
