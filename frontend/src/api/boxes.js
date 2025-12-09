import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getBoxes = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/boxes`, { params: filters });
  return response.data;
};

export const getBox = async (id) => {
  const response = await axios.get(`${API_URL}/boxes/${id}`);
  return response.data;
};

export const createBox = async (data) => {
  const response = await axios.post(`${API_URL}/boxes`, data);
  return response.data;
};

export const updateBox = async (id, data) => {
  const response = await axios.put(`${API_URL}/boxes/${id}`, data);
  return response.data;
};

export const deleteBox = async (id) => {
  const response = await axios.delete(`${API_URL}/boxes/${id}`);
  return response.data;
};