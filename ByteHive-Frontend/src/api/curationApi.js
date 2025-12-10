import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:5007/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Get user auth token from localStorage
const getAuthToken = () => {
  try {
    const authData = localStorage.getItem('Auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token;
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Extract user ID from JWT token
const getUserIdFromToken = () => {
  try {
    const token = getAuthToken();
    if (!token) return 'user123'; // Fallback
    
    const decoded = jwtDecode(token);
    const userId = decoded?._id || decoded?.id || decoded?.user_id || decoded?.userId || decoded?.sub;
    return userId || 'user123';
  } catch (error) {
    console.error('Error decoding token:', error);
    return 'user123';
  }
};

// Add token to request headers
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Saved Posts API
export const savePost = async (postId, category) => {
  try {
    const userId = getUserIdFromToken();
    console.log('Saving post:', { postId, category, userId, url: `${API_URL}/saved/save` });
    const response = await api.post('/saved/save', { postId, category, userId });
    console.log('Save response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Save post error:', error.response?.data || error.message);
    throw error.response?.data || error.message;
  }
};

export const getSavedPosts = async (category) => {
  try {
    const userId = getUserIdFromToken();
    const response = await api.get('/saved', { params: { category, userId } });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const searchSavedPosts = async (searchTerm, category) => {
  try {
    const userId = getUserIdFromToken();
    const response = await api.get('/saved/search', {
      params: { searchTerm, category, userId }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const checkSavedStatus = async (postId) => {
  try {
    const userId = getUserIdFromToken();
    const response = await api.get(`/saved/check/${postId}`, { params: { userId } });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Unsave Post API
export const unsavePost = async (postId) => {
  try {
    const userId = getUserIdFromToken();
    // Send category: null to unsave
    const response = await api.post('/saved/save', { postId, category: null, userId });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// History API
export const recordView = async (postId) => {
  try {
    const userId = getUserIdFromToken();
    const response = await api.post('/history', { postId, userId });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getHistory = async (page = 1, limit = 10) => {
  try {
    const userId = getUserIdFromToken();
    console.log('API: Calling getHistory with params:', { page, limit, userId });
    const response = await api.get('/history', {
      params: { page, limit, userId }
    });
    console.log('API: getHistory raw response:', response);
    return response.data;
  } catch (error) {
    console.error('API: getHistory error:', error);
    console.error('API: Error response:', error.response);
    throw error.response?.data || { message: error.message };
  }
};

export const searchHistory = async (searchTerm) => {
  try {
    const userId = getUserIdFromToken();
    console.log('API: Calling searchHistory with params:', { searchTerm, userId });
    const response = await api.get('/history/search', {
      params: { q: searchTerm, userId }
    });
    console.log('API: searchHistory raw response:', response);
    return response.data;
  } catch (error) {
    console.error('API: searchHistory error:', error);
    throw error.response?.data || { message: error.message };
  }
};

export const clearHistory = async () => {
  try {
    const userId = getUserIdFromToken();
    console.log('API: Calling clearHistory with userId:', userId);
    const response = await api.delete('/history/clear', {
      data: { userId }
    });
    console.log('API: clearHistory raw response:', response);
    return response.data;
  } catch (error) {
    console.error('API: clearHistory error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// Delete selected history items
export const deleteHistoryItems = async (itemIds) => {
  try {
    const userId = getUserIdFromToken();
    const response = await api.delete('/history/items', {
      data: { userId, itemIds }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: error.message };
  }
};