// Robust import for jwt-decode to support different bundler/interop behaviors
import * as jwtDecodeModule from 'jwt-decode';

const _decodeJwt = (token) => {
  if (!token) return null;
  // Try default export (CJS/ESM interop)
  if (jwtDecodeModule && typeof jwtDecodeModule.default === 'function') {
    return jwtDecodeModule.default(token);
  }
  // Try named export jwtDecode
  if (jwtDecodeModule && typeof jwtDecodeModule.jwtDecode === 'function') {
    return jwtDecodeModule.jwtDecode(token);
  }
  // If module itself is a function
  if (typeof jwtDecodeModule === 'function') {
    return jwtDecodeModule(token);
  }
  // Last resort: try to access as a value
  if (jwtDecodeModule && jwtDecodeModule['default']) {
    const fn = jwtDecodeModule['default'];
    if (typeof fn === 'function') return fn(token);
  }
  throw new Error('jwt-decode: unable to find decode function on module');
};

const API_BASE_URL = 'http://localhost:5001/api';

// Helper function to get authorization headers
const getAuthHeaders = () => {
  const authData = localStorage.getItem('Auth');
  console.log('Auth data from localStorage:', authData);
  
  if (!authData) {
    throw new Error('No token, authorization denied');
  }
  
  try {
    const parsed = JSON.parse(authData);
    const token = parsed.token;
    console.log('Extracted token:', token ? 'Token found' : 'No token in parsed data');
    
    if (!token) {
      throw new Error('No token, authorization denied');
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    console.log('Authorization headers prepared:', headers);
    return headers;
  } catch (error) {
    console.error('Error parsing auth data:', error);
    throw new Error('Invalid token format, authorization denied');
  }
};

// Helper function to extract user ID from auth token
const getUserIdFromAuth = () => {
  const authData = localStorage.getItem('Auth');
  if (!authData) {
    throw new Error('No auth data found');
  }
  
  try {
    const parsed = JSON.parse(authData);
    console.log('Full parsed auth data:', parsed);
    
    if (!parsed.token) {
      throw new Error('No token found in auth data');
    }
    
    // Decode JWT token to extract user ID
    const decoded = _decodeJwt(parsed.token);
    console.log('Decoded JWT payload:', decoded);
    console.log('Available fields in JWT:', Object.keys(decoded));
    
    // Extract user ID from decoded token with detailed logging
    const userId = decoded._id || decoded.id || decoded.user_id || decoded.userId;
    
    console.log('User ID extraction details:', {
      '_id': decoded._id,
      'id': decoded.id,
      'user_id': decoded.user_id,
      'userId': decoded.userId,
      'finalUserId': userId
    });
    
    if (!userId) {
      console.error('No user ID found in JWT payload. Token payload:', decoded);
      throw new Error('User ID not found in auth token');
    }
    
    console.log('✅ Successfully extracted user ID from JWT:', userId);
    return userId;
  } catch (error) {
    console.error('Error parsing auth data for user ID:', error);
    throw new Error('Invalid auth token format');
  }
};

export const communityApi = {
  // Discover Communities (Public)
  discoverCommunities: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.tags) queryParams.append('tags', filters.tags.join(','));
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.visible) queryParams.append('visible', filters.visible);
      
      const response = await fetch(
        `${API_BASE_URL}/communities/discover?${queryParams}`,
        {
          method: 'GET',
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error discovering communities:', error);
      throw error;
    }
  },

  // Get Community Details (Public)
  getCommunityDetails: async (communityId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting community details:', error);
      throw error;
    }
  },

  // Get Community Posts (helper) - returns an object with community.posts for compatibility
  getCommunityPosts: async (communityId) => {
    try {
      // Reuse getCommunityDetails to retrieve posts array
      const details = await (async () => {
        const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, { method: 'GET' });
        if (!response.ok) {
          const txt = await response.text().catch(() => '');
          throw new Error(`HTTP error! status: ${response.status} - ${txt}`);
        }
        return await response.json();
      })();

      // Ensure shape: { community: { posts: [...] } }
      const posts = details?.community?.posts || [];
      return { community: { posts } };
    } catch (error) {
      console.error('Error getting community posts:', error);
      throw error;
    }
  },

  // Create Community (Protected)
  createCommunity: async (communityData, imageFile = null) => {
    try {
      const formData = new FormData();
      
      // Extract user_id from auth token using the helper function
      let currentUserId = null;
      try {
        currentUserId = getUserIdFromAuth();
        console.log('🔐 Current user ID from token for community creation:', currentUserId);
      } catch (e) {
        console.error('❌ Could not extract user ID from auth token:', e);
        throw new Error('User authentication required. Please log in again.');
      }
      
      // Include user_id in the form data
      formData.append('user_id', currentUserId);
      console.log('📤 Added user_id to FormData for backend:', currentUserId);
      console.log('📋 Community data being sent:', {
        community_name: communityData.community_name,
        user_id: currentUserId,
        description: communityData.description.substring(0, 100) + '...',
        visible: communityData.visible,
        moderation: communityData.moderation
      });
      
      formData.append('community_name', communityData.community_name);
      formData.append('description', communityData.description);
      
      // Send each tag individually for backend compatibility
      if (communityData.community_tags && communityData.community_tags.length > 0) {
        communityData.community_tags.forEach(tag => {
          formData.append('community_tags[]', tag);
        });
      }
      
      if (communityData.visible) {
        formData.append('visible', communityData.visible);
      }
      
      if (communityData.moderation) {
        formData.append('moderation', communityData.moderation);
      }
      
      // Only append image if it exists and is valid
      if (imageFile && imageFile instanceof File) {
        console.log('Adding image to FormData:', {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size
        });
        formData.append('image', imageFile);
      } else if (imageFile) {
        console.warn('Image file is not a valid File object:', typeof imageFile);
      }
      
      // Debug: Log what's being sent
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      const response = await fetch(`${API_BASE_URL}/communities`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.error('Backend error response:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // If there are validation errors, include them
          if (errorData.errors) {
            const validationErrors = Object.entries(errorData.errors)
              .map(([field, message]) => `${field}: ${message}`)
              .join(', ');
            errorMessage += ` (Validation errors: ${validationErrors})`;
          }
        } catch (parseError) {
          console.error('Could not parse error response as JSON:', parseError);
          // Try to get text response
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            console.error('Could not get error response text:', textError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Community created successfully with user_id:', currentUserId, 'Result:', result);
      return result;
    } catch (error) {
      console.error('Error creating community:', error);
      
      // If it's a network error or parsing error, provide more context
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your connection.');
      }
      
      throw error;
    }
  },

  // Update Community (Protected) 
  updateCommunity: async (communityId, communityData, imageFile = null) => {
    try {
      const formData = new FormData();
      
      if (communityData.community_name) {
        formData.append('community_name', communityData.community_name);
      }
      if (communityData.description) {
        formData.append('description', communityData.description);
      }
      
      // Handle tags properly - send each tag individually
      if (communityData.community_tags && communityData.community_tags.length > 0) {
        communityData.community_tags.forEach(tag => {
          formData.append('community_tags[]', tag);
        });
      }
      
      if (communityData.visible) {
        formData.append('visible', communityData.visible);
      }
      if (communityData.moderation) {
        formData.append('moderation', communityData.moderation);
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // Attach current user id so backend can authorize the update
      try {
        const currentUserId = getUserIdFromAuth();
        formData.append('userId', currentUserId);
      } catch (e) {
        console.warn('Could not attach userId to update request:', e.message);
      }

      const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders()
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating community:', error);
      throw error;
    }
  },

  // Follow Community (Protected)
  followCommunity: async (communityId) => {
    try {
      // include userId in the request body as the backend requires it
      const userId = getUserIdFromAuth();
      const response = await fetch(`${API_BASE_URL}/communities/${communityId}/follow`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error following community:', error);
      throw error;
    }
  },

  // Unfollow Community (Protected)
  unfollowCommunity: async (communityId) => {
    try {
      // include userId in the request body as the backend requires it
      const userId = getUserIdFromAuth();
      const response = await fetch(`${API_BASE_URL}/communities/${communityId}/unfollow`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error unfollowing community:', error);
      throw error;
    }
  },

  // Get User's Communities (Protected)
  getUserCommunities: async (searchQuery = '', forceRefresh = false) => {
    try {
      console.log('getUserCommunities called with searchQuery:', searchQuery, 'forceRefresh:', forceRefresh);
      
      // Get auth data to extract user id for the route
      let currentUserId = null;
      try {
        currentUserId = getUserIdFromAuth();
        console.log('Current user ID from token:', currentUserId);
      } catch (e) {
        console.error('Could not parse auth data for user ID:', e);
        throw new Error('User authentication required to fetch your communities');
      }

      let queryParams = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : '';

      // Add cache-busting parameter if force refresh is requested
      if (forceRefresh) {
        const separator = queryParams ? '&' : '?';
        queryParams += `${separator}_t=${Date.now()}`;
      }

      // Build URL with the actual userId as required by the backend route '/user/:userId'
      const url = `${API_BASE_URL}/communities/user/${encodeURIComponent(currentUserId)}${queryParams}`;
      console.log('Making request to:', url);
      
      const headers = getAuthHeaders();
      console.log('Using headers:', headers);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('User communities data received:', data);
      
      // Debug: Check if the returned communities actually belong to the current user
      if (data.owned && currentUserId) {
        console.log('Ownership verification:');
        data.owned.forEach(community => {
          const matches = community.user_id === currentUserId;
          console.log(`Community "${community.community_name}" (${community._id}): user_id=${community.user_id}, currentUser=${currentUserId}, matches=${matches}`);
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user communities:', error);
      throw error;
    }
  },

  // Delete Community (Protected)
  deleteCommunity: async (communityId) => {
    try {
      // backend expects userId in the request body for authorization
      let body = null;
      try {
        const userId = getUserIdFromAuth();
        body = JSON.stringify({ userId });
      } catch (e) {
        console.warn('No userId available for delete request:', e.message);
      }

      const response = await fetch(`${API_BASE_URL}/communities/${communityId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting community:', error);
      throw error;
    }
  },
};