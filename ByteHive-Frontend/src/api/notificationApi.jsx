import axios from "axios";
import { getAuthHeader } from "./authHeader";

const API = axios.create({
  baseURL: import.meta.env.VITE_NOTIFICATION_SERVICE_URL,
});

export const getNotifications = (userId) =>
   API.get(`/notifications/${userId}`, { headers: getAuthHeader() });

export const deleteNotification = (notificationId) => 
  API.delete(`/notifications/delete/${notificationId}`, { headers: getAuthHeader() });

export const markNotificationAsRead = (userId) => 
  API.put(`/notifications/${userId}/read`, {}, { headers: getAuthHeader() });


export const getPreferences = (userId) => 
  API.get(`/preferences/${userId}`, { headers: getAuthHeader() });

export const updatePreferences = (userId, newPrefs) => 
  API.put(`/preferences/${userId}`, newPrefs, { headers: getAuthHeader() });
