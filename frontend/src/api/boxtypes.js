// =======================================================
// BOXES SERVICE — ENTERPRISE VERSION
// Voll kompatibel mit TrapMap Backend & Maps.jsx
// =======================================================

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// -------------------------------------------------------
// TOKEN HANDLING (automatisch)
// -------------------------------------------------------
function getToken() {
  return (
    localStorage.getItem("sb_token") ||
    localStorage.getItem("trapmap_token") ||
    null
  );
}

function authHeader() {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

// -------------------------------------------------------
// GET ALL BOXES (filters: object_id, status, type …)
// -------------------------------------------------------
export const getBoxes = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/boxes`, {
      params: filters,
      headers: authHeader(),
    });
    return response.data;
  } catch (err) {
    console.error("❌ getBoxes() error:", err.response?.data || err.message);
    throw err;
  }
};

// -------------------------------------------------------
// GET SINGLE BOX
// -------------------------------------------------------
export const getBox = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/boxes/${id}`, {
      headers: authHeader(),
    });
    return response.data;
  } catch (err) {
    console.error("❌ getBox() error:", err.response?.data || err.message);
    throw err;
  }
};

// -------------------------------------------------------
// CREATE BOX — Enterprise-Data
// -------------------------------------------------------
export const createBox = async ({
  object_id,
  box_type_id,
  box_name,
  number,
  lat,
  lng,
  notes,
  created_by,
  current_status = "green",
  control_interval_days = 30,
}) => {
  try {
    const payload = {
      object_id,
      box_type_id,
      box_name,
      number,
      lat,
      lng,
      notes: notes || "",
      created_by,
      active: true,
      current_status,
      control_interval_days,
    };

    const response = await axios.post(`${API_URL}/boxes`, payload, {
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
    });

    return response.data;
  } catch (err) {
    console.error("❌ createBox() error:", err.response?.data || err.message);
    throw err;
  }
};

// -------------------------------------------------------
// UPDATE BOX — nutzt PATCH im Backend
// -------------------------------------------------------
export const updateBox = async (id, data) => {
  try {
    const response = await axios.patch(`${API_URL}/boxes/${id}`, data, {
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
    });

    return response.data;
  } catch (err) {
    console.error("❌ updateBox() error:", err.response?.data || err.message);
    throw err;
  }
};

// -------------------------------------------------------
// UPDATE BOX LOCATION (Separater Endpoint im Backend)
// -------------------------------------------------------
export const updateBoxLocation = async (id, { lat, lng }) => {
  try {
    const response = await axios.patch(
      `${API_URL}/boxes/${id}/location`,
      { lat, lng },
      {
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("❌ updateBoxLocation() error:", err.response?.data || err.message);
    throw err;
  }
};

// -------------------------------------------------------
// DELETE BOX (soft delete oder hard delete je backend config)
// -------------------------------------------------------
export const deleteBox = async (id) => {
  try {
    await axios.delete(`${API_URL}/boxes/${id}`, {
      headers: authHeader(),
    });
    return true; // <- Einheitlich für Frontend
  } catch (err) {
    console.error("❌ deleteBox() error:", err.response?.data || err.message);
    throw err;
  }
};
