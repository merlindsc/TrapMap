import api from "./axios";

/** GET all layouts of an object */
export const getLayoutsByObject = async (objectId) => {
  const res = await api.get(`/layouts?object_id=${objectId}`);
  return res.data.data;
};

/** GET single layout */
export const getLayout = async (layoutId) => {
  const res = await api.get(`/layouts/${layoutId}`);
  return res.data.data;
};

/** CREATE layout */
export const createLayout = async (payload) => {
  const res = await api.post(`/layouts`, payload);
  return res.data.data;
};

/** UPDATE layout */
export const updateLayout = async (id, payload) => {
  const res = await api.put(`/layouts/${id}`, payload);
  return res.data.data;
};

/** DELETE layout */
export const deleteLayout = async (id) => {
  return api.delete(`/layouts/${id}`);
};
