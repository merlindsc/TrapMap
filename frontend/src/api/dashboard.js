import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getDashboardStats = async () => {
  let token = null;
  try {
    token = localStorage.getItem("trapmap_token");
  } catch (error) {
    console.error("localStorage nicht verfügbar:", error);
    // Return empty stats if localStorage is unavailable
    return { objects: 0, boxes: 0, scans_today: 0, scans_week: 0 };
  }

  const res = await axios.get(`${API_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
};

export const getRecentScans = async () => {
  let token = null;
  try {
    token = localStorage.getItem("trapmap_token");
  } catch (error) {
    console.error("localStorage nicht verfügbar:", error);
    // Return empty array if localStorage is unavailable
    return [];
  }

  const res = await axios.get(`${API_URL}/dashboard/recent-scans`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data.scans;
};
