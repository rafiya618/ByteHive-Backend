import axios from "axios";
import { getAuthHeader } from "./authHeader";

const API = axios.create({
  baseURL: import.meta.env.VITE_AUTH_SERVICE_URL,
});

export const getProfile = (userIdentifier) => {
  // If caller passed a primitive id (string/number), use it directly
  if (typeof userIdentifier === "string" || typeof userIdentifier === "number") {
    return API.get(`/profile/${userIdentifier}`, { headers: getAuthHeader() });
  }

  // If caller passed an object, try to extract common id fields
  if (userIdentifier && typeof userIdentifier === "object") {
    const id = userIdentifier.user_id || userIdentifier.userId || userIdentifier.id;
    if (id) {
      return API.get(`/profile/${id}`, { headers: getAuthHeader() });
    }
    // No id found: send object as query params to /profile (backend can handle lookup)
    return API.get(`/profile`, { params: userIdentifier, headers: getAuthHeader() });
  }

  // Fallback: call /profile without params
  return API.get(`/profile`, { headers: getAuthHeader() });
};

export const updateProfile = (userId, formData) => 
  API.put(`/profile/${userId}`, formData, { headers: getAuthHeader() });

export const createProfile = (userId, formData) => 
  API.post(`/profile/setup/${userId}`, formData, { headers: getAuthHeader() });
