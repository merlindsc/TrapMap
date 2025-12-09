import api from "./api";

/**
 * Holt die neuesten Scans
 */
export const getRecentScans = async (limit = 10) => {
  return api.get(`/scans/recent?limit=${limit}`);
};

/**
 * Holt ALLE Scans einer Box
 */
export const getBoxScans = async (boxId) => {
  return api.get(`/scans/box/${boxId}`);
};

/**
 * Holt ALLE Scans eines Objekts
 */
export const getObjectScans = async (objectId) => {
  return api.get(`/scans/object/${objectId}`);
};

/**
 * Erstellt einen neuen Scan
 */
export const createScan = async (scanData) => {
  return api.post(`/scans`, scanData);
};

/**
 * Holt einen einzelnen Scan
 */
export const getScanById = async (scanId) => {
  return api.get(`/scans/${scanId}`);
};
