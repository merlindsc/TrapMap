import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Token automatisch anhängen
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("trapmap_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("localStorage nicht verfügbar - Token kann nicht geladen werden:", error);
  }
  return config;
});

export default api;
