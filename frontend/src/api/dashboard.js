import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getDashboardStats = async () => {
  let token = null;
  try {
    token = localStorage.getItem("trapmap_token");
  } catch (error) {
    console.error("localStorage nicht verfügbar:", error);
    throw new Error("localStorage nicht verfügbar");
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
    throw new Error("localStorage nicht verfügbar");
  }

  const res = await axios.get(`${API_URL}/dashboard/recent-scans`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data.scans;
};
