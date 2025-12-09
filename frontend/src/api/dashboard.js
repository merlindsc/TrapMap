import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getDashboardStats = async () => {
  const token = localStorage.getItem("trapmap_token");

  const res = await axios.get(`${API_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
};

export const getRecentScans = async () => {
  const token = localStorage.getItem("trapmap_token");

  const res = await axios.get(`${API_URL}/dashboard/recent-scans`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data.scans;
};
