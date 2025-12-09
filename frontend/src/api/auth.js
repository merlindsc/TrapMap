import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });

    console.log("✅ LOGIN API RESPONSE:", response.data);

    // Return the full response data
    return response.data;

  } catch (error) {
    console.error("❌ LOGIN API ERROR:", error);

    // Normalize the error
    return {
      error: true,
      message: error.response?.data?.message || error.message || "Login failed"
    };
  }
};

export const logout = async () => {
  const token = localStorage.getItem('trapmap_token');

  if (token) {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("✅ Logout successful");
    } catch (error) {
      console.warn("⚠️ Logout warning:", error.message);
    }
  }
};