// src/api/chatApi.js
import { getAuthHeaders } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:5050/api';

// Base API request handler for chat
const chatApiRequest = async (url, options = {}) => {
  console.log('Making chat API request to:', `${API_BASE_URL}${url}`);
  console.log('Request options:', options);
  
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    console.log('Chat API response status:', response.status);
    console.log('Chat API response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('Chat API error data:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Chat API response data:', responseData);
    return responseData;
  } catch (error) {
    console.error('Chat API request failed:', error);
    throw error;
  }
};

// Authenticated API request handler
const authenticatedRequest = async (url, options = {}) => {
  try {
    const authHeaders = getAuthHeaders();
    return await apiRequest(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      }
    });
  } catch (error) {
    throw error;
  }
};

export const chatApi = {
  // Join Chat Room - Updated to require both userId and communityId
  joinChatRoom: async (userId, communityId) => {
    console.log('Joining chat room:', { userId, communityId });
    
    if (!userId || !communityId) {
      throw new Error('Both user_id and community_id are required');
    }
    
    try {
      const response = await chatApiRequest('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          community_id: communityId // Added community_id back
        })
      });
      
      console.log('Join room API response:', response);
      return response;
    } catch (error) {
      console.error('Join room API error:', error);
      throw new Error(error.message || 'Failed to join chat room');
    }
  },

  // Get Chat Room Details
  getChatRoomDetails: async (roomId) => {
    try {
      console.log('Getting room details for:', roomId);
      const response = await chatApiRequest(`/rooms/details/${roomId}`, {
        method: 'GET'
      });
      
      console.log('Get room details response:', response);
      return response;
    } catch (error) {
      console.error('Get room details error:', error);
      
      // If the details endpoint doesn't exist, try a generic room endpoint
      try {
        console.log('Trying fallback room endpoint...');
        const fallbackResponse = await chatApiRequest(`/rooms/${roomId}`, {
          method: 'GET'
        });
        console.log('Fallback room details response:', fallbackResponse);
        return fallbackResponse;
      } catch (fallbackError) {
        console.error('Fallback room details error:', fallbackError);
        throw new Error(error.message || 'Failed to get room details');
      }
    }
  },

  // Create Chat Thread
  createChatThread: async (roomId, threadName, userId) => {
    console.log('Creating chat thread:', { roomId, threadName, userId });
    
    try {
      const response = await chatApiRequest('/threads/create', {
        method: 'POST',
        body: JSON.stringify({
          room_id: roomId,
          thread_name: threadName,
          user_id: userId
        })
      });
      
      console.log('Create thread API response:', response);
      return response;
    } catch (error) {
      console.error('Create thread API error:', error);
      throw new Error(error.message || 'Failed to create thread');
    }
  },

  // Get Chat Threads
  getChatThreads: async (roomId) => {
    console.log('Getting chat threads for room:', roomId);
    
    try {
      const response = await chatApiRequest(`/threads/${roomId}`, {
        method: 'GET'
      });
      
      console.log('Get threads API response:', response);
      return response;
    } catch (error) {
      console.error('Get threads API error:', error);
      throw new Error(error.message || 'Failed to get threads');
    }
  },

  // Delete Chat Thread
  deleteChatThread: async (roomId, threadId, userId) => {
    console.log('Deleting chat thread:', { roomId, threadId, userId });
    
    try {
      const response = await chatApiRequest('/threads/delete', {
        method: 'DELETE',
        body: JSON.stringify({
          room_id: roomId,
          thread_id: threadId,
          user_id: userId
        })
      });
      
      console.log('Delete thread API response:', response);
      return response;
    } catch (error) {
      console.error('Delete thread API error:', error);
      throw new Error(error.message || 'Failed to delete thread');
    }
  },

  // Get Chat Messages
  getChatMessages: async (threadId) => {
    console.log('Getting chat messages for thread:', threadId);
    
    try {
      const response = await chatApiRequest(`/messages/${threadId}`, {
        method: 'GET'
      });
      
      console.log('Get messages API response:', response);
      return response;
    } catch (error) {
      console.error('Get messages API error:', error);
      throw new Error(error.message || 'Failed to get messages');
    }
  },

  // Send Chat Message
  sendChatMessage: async (roomId, threadId, senderId, content) => {
    console.log('Sending chat message:', { roomId, threadId, senderId, content });
    
    try {
      const response = await chatApiRequest('/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          room_id: roomId,
          thread_id: threadId,
          sender_id: senderId,
          content: content
        })
      });
      
      console.log('Send message API response:', response);
      return response;
    } catch (error) {
      console.error('Send message API error:', error);
      throw new Error(error.message || 'Failed to send message');
    }
  }
};