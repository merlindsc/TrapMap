import api from "./axios";

// GET alle Objekte
export const getObjects = async (filters = {}) => {
  const response = await api.get("/objects", { params: filters });

  // Backend sendet direkt Array, kein success
  return response.data;
};

export const getObject = async (id) => {
  const response = await api.get(`/objects/${id}`);

  // Backend sendet direkt Objekt
  return response.data;
};

export const createObject = async (data) => {
  const response = await api.post(`/objects`, data);

  // Backend sendet direkt das neue Objekt:
  // { id, name, ... }
  return response.data;
};

export const updateObject = async (id, data) => {
  const response = await api.put(`/objects/${id}`, data);
  return response.data;
};

export const deleteObject = async (id) => {
  const response = await api.delete(`/objects/${id}`);
  return response.data;
};
