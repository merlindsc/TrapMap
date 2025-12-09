import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('trapmap_token');
    const savedUser = localStorage.getItem('trapmap_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        console.log("Session restored");
      } catch (error) {
        console.error("Failed to restore session:", error);
        localStorage.removeItem('trapmap_token');
        localStorage.removeItem('trapmap_user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      console.log("LOGIN ATTEMPT:", email);
      
      const response = await apiLogin(email, password);

      console.log("LOGIN RESPONSE:", response);

      if (response.error) {
        console.error("Login failed:", response.message);
        return false;
      }

      if (response && response.token && response.user) {
        console.log("Login successful! Saving session");
        
        setToken(response.token);
        setUser(response.user);

        localStorage.setItem('trapmap_token', response.token);
        localStorage.setItem('trapmap_user', JSON.stringify(response.user));

        console.log("Session saved");
        
        return true;
      }

      console.error("Invalid response format:", response);
      return false;

    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    console.log("Logging out");
    
    setUser(null);
    setToken(null);

    localStorage.removeItem('trapmap_token');
    localStorage.removeItem('trapmap_user');

    apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ NEU: useAuth Hook hinzufügen
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};