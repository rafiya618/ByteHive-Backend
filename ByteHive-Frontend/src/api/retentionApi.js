import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://127.0.0.1:5005/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Get user auth token from localStorage
const getAuthToken = () => {
  try {
    const authData = localStorage.getItem('Auth');
    console.log('🔑 Retrieved Auth from localStorage:', authData ? 'Found' : 'NOT FOUND');
    if (authData) {
      const parsed = JSON.parse(authData);
      console.log('📦 Parsed auth data:', { hasToken: !!parsed.token, email: parsed.email });
      return parsed.token;
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
};

// Extract user ID from JWT token
const getUserIdFromToken = () => {
  try {
    const token = getAuthToken();
    if (!token) return null;

    const decoded = jwtDecode(token);
    console.log('🔓 Decoded JWT token:', decoded);
    // Check various possible userId field names
    const userId = decoded?._id || decoded?.id || decoded?.user_id || decoded?.userId || decoded?.sub;
    console.log('✅ Extracted userId:', userId, 'from fields:', Object.keys(decoded));
    return userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
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

// Record user activity (read, post, comment, like)
export const recordActivity = async (activityType, postId = null, commentId = null, description = null) => {
  try {
    const userId = getUserIdFromToken();
    console.log('🎬 Recording activity:', { activityType, userId, postId, commentId, description });

    if (!userId) {
      console.warn('❌ No user ID found in token, cannot record activity');
      return null;
    }

    const payload = {
      user_id: userId,
      activity_type: activityType,
      post_id: postId,
      comment_id: commentId,
      activity_description: description
    };

    console.log('📤 Sending activity payload:', payload);
    const response = await api.post('/retention/activity/record', payload);
    console.log('✅ Activity recorded successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error recording activity:', {
      activity: activityType,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error.response?.data || error.message;
  }
};

// Get user streak information
export const getUserStreak = async (userId = null) => {
  try {
    const uid = userId || getUserIdFromToken();
    console.log('🔥 Fetching streak for user ID:', uid);

    if (!uid) {
      console.warn('❌ No user ID found in token');
      return {
        current_streak: 0,
        longest_streak: 0,
        current_level: 1,
        total_days_active: 0,
        total_posts: 0,
        total_reads: 0,
        total_comments: 0,
        total_likes: 0,
        activity_metrics: {
          total_posts: 0,
          total_reads: 0,
          total_comments: 0,
          total_likes: 0
        },
        badges_earned: [],
        badge_details: []
      };
    }

    console.log('📡 Making API request to:', `/retention/streak/${uid}`);
    const response = await api.get(`/retention/streak/${uid}`);
    console.log('✅ Streak API response received:', response.data);

    // Extract streak data from response structure
    const streakData = response.data?.streak || response.data;
    console.log('📊 Extracted streak data:', streakData);

    const result = {
      current_streak: streakData?.current_streak ?? 0,
      longest_streak: streakData?.longest_streak ?? 0,
      current_level: streakData?.current_level ?? 1,
      total_days_active: streakData?.total_days_active ?? 0,
      // Expose metrics at root level for StreakDropdown compatibility
      total_posts: streakData?.total_posts ?? 0,
      total_reads: streakData?.total_reads ?? 0,
      total_comments: streakData?.total_comments ?? 0,
      total_likes: streakData?.total_likes ?? 0,
      // Also keep activity_metrics for backwards compatibility
      activity_metrics: {
        total_posts: streakData?.total_posts ?? 0,
        total_reads: streakData?.total_reads ?? 0,
        total_comments: streakData?.total_comments ?? 0,
        total_likes: streakData?.total_likes ?? 0
      },
      badges_earned: streakData?.badges_earned ?? [],
      badge_details: streakData?.badge_details ?? []
    };
    console.log('🎯 Final result to return:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching user streak:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config?.url
    });
    // Return default streak instead of throwing
    const defaultData = {
      current_streak: 0,
      longest_streak: 0,
      current_level: 1,
      total_days_active: 0,
      total_posts: 0,
      total_reads: 0,
      total_comments: 0,
      total_likes: 0,
      activity_metrics: {
        total_posts: 0,
        total_reads: 0,
        total_comments: 0,
        total_likes: 0
      },
      badges_earned: [],
      badge_details: []
    };
    console.log('⚠️ Returning default data:', defaultData);
    return defaultData;
  }
};

// Get user badges
export const getUserBadges = async (userId = null) => {
  try {
    const uid = userId || localStorage.getItem('userId') || '1';
    const response = await api.get(`/retention/badges/${uid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user badges:', error);
    throw error.response?.data || error.message;
  }
};

// Get all badge definitions
export const getAllBadges = async () => {
  try {
    const response = await api.get('/retention/badges/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching all badges:', error);
    throw error.response?.data || error.message;
  }
};

// Get user level
export const getUserLevel = async (userId = null) => {
  try {
    const uid = userId || localStorage.getItem('userId') || '1';
    const response = await api.get(`/retention/level/${uid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user level:', error);
    throw error.response?.data || error.message;
  }
};

// Get user stats
export const getUserStats = async (userId = null) => {
  try {
    const uid = userId || getUserIdFromToken();
    if (!uid) {
      console.warn('❌ No user ID for stats');
      return { stats: { total_posts: 0, total_reads: 0, total_comments: 0, total_likes: 0 } };
    }
    const response = await api.get(`/retention/stats/${uid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { stats: { total_posts: 0, total_reads: 0, total_comments: 0, total_likes: 0 } };
  }
};

// Get leaderboard
export const getLeaderboard = async () => {
  try {
    const response = await api.get('/retention/leaderboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { leaderboard: [] };
  }
};

// Reset streak (optional endpoint if user wants to reset)
export const resetStreak = async (userId = null) => {
  try {
    const uid = userId || localStorage.getItem('userId') || '1';
    const response = await api.post(`/retention/streak/reset`, { user_id: uid });
    return response.data;
  } catch (error) {
    console.error('Error resetting streak:', error);
    throw error.response?.data || error.message;
  }
};
// Export object for hooks that use named import { retentionApi }
export const retentionApi = {
  recordActivity,
  getUserStreak,
  getUserBadges,
  getAllBadges,
  getUserLevel,
  getUserStats,
  getLeaderboard,
  resetStreak
};

export default retentionApi;
