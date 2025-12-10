// ============================================
// FRONTEND AUTH API
// API calls for authentication
// ============================================

import api from "./axios";

/**
 * Login User
 */
export const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

/**
 * Logout User (client-side only)
 */
export const logout = () => {
  localStorage.removeItem("trapmap_token");
  localStorage.removeItem("trapmap_refresh_token");
  localStorage.removeItem("trapmap_user");
};

/**
 * Refresh Token
 */
export const refreshToken = async (refreshToken) => {
  const response = await api.post("/auth/refresh", { refreshToken });
  return response.data;
};

/**
 * Get current user profile
 */
export const getProfile = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

/**
 * Change Password
 */
export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post("/auth/change-password", {
    currentPassword,
    newPassword
  });
  return response.data;
};