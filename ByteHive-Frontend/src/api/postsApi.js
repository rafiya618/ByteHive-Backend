import { getAuthHeader } from './authHeader';

const API_BASE_URL = 'http://localhost:5000/api';

// Base API request handler for posts
const apiRequest = async (url, options = {}) => {
  console.log('Making API request to:', `${API_BASE_URL}${url}`);
  console.log('Request options:', options);
  
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    console.log('API response status:', response.status);
    console.log('API response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('API error data:', errorData);
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('API response data:', responseData);
    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Authenticated API request handler
const authenticatedRequest = async (url, options = {}) => {
  try {
    const authHeaders = getAuthHeader();
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

// Add local JWT decode helper to extract user id from token returned by getAuthHeader()
const decodeJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const getUserIdFromTokenLocal = () => {
  try {
    const headers = getAuthHeader();
    console.log('Auth headers:', headers);
    const auth = headers.Authorization || headers.authorization;
    if (!auth) return null;
    const token = auth.split(' ')[1];
    console.log('JWT token:', token);
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    // Common claim names: user_id, _id, id, sub, userId
    const id = payload.user_id ?? payload._id ?? payload.id ?? payload.sub ?? payload.userId;
    console.log('Decoded user ID from token:', id);   
    return id !== undefined && id !== null ? String(id) : null;
  } catch (err) {
    return null;
  }
};

export const postsApi = {
  // Test API connection
  testConnection: async () => {
    try {
      console.log('Testing posts API connection...');
      return await apiRequest('/posts?limit=1');
    } catch (error) {
      console.error('Posts API connection test failed:', error);
      throw error;
    }
  },

  // Create Post (Protected) - Updated to work with your existing controller
  createPost: async (postData) => {
    const userId = getUserIdFromTokenLocal();
    console.log('Creating post with user ID:', userId);
    
    // Send data exactly as your Posts controller expects
    const postPayload = {
      post_title: postData.post_title,
      small_description: postData.small_description,
      post_description: postData.post_description,
      category: postData.category,
      tags: postData.tags || [],
      community: postData.community, // Just the community name as string
      user_id: userId, // Keep as string since your model uses String type
      thumbnail: postData.thumbnail || null,
      mediaInputs: postData.mediaInputs || []
    };
    
    console.log('Final post payload:', postPayload);
    
    return await authenticatedRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postPayload)
    });
  },

  // Get Posts (Public)
  getPosts: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.skip) queryParams.append('skip', filters.skip);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.user_id) queryParams.append('user_id', filters.user_id);
    if (filters.community_id) queryParams.append('community_id', filters.community_id);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.tags) queryParams.append('tags', filters.tags.join(','));
    
    return await apiRequest(`/posts?${queryParams}`);
  },

  // Get Posts with Community Info (Public)
  getPostsWithCommunities: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    
    if (filters.skip) queryParams.append('skip', filters.skip);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.user_id) queryParams.append('user_id', filters.user_id);
    if (filters.community_id) queryParams.append('community_id', filters.community_id);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.tags) queryParams.append('tags', filters.tags.join(','));
    
    const response = await apiRequest(`/posts?${queryParams}`);
    return response;
  },

  // Get Post by ID (Public) - with proper error handling
  getPostById: async (postId) => {
    try {
      console.log('Fetching post by ID:', postId);
      const response = await apiRequest(`/posts/${postId}`);
      console.log('Post API response:', response);
      
      // Ensure the response has the expected structure
      if (response.ok && response.post) {
        // Transform the post data to ensure all required fields exist
        const post = {
          ...response.post,
          tags: Array.isArray(response.post.tags) ? response.post.tags : [],
          author: response.post.author || { name: "Unknown", avatar: "" },
          post_title: response.post.post_title || "",
          small_description: response.post.small_description || "",
          community: response.post.community || "",
          upvotes: response.post.upvotes || 0,
          downvotes: response.post.downvotes || 0,
          views: response.post.views || 0,
          comments: response.post.comments || 0
        };
        
        return { ...response, post };
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching post by ID:', error);
      throw error;
    }
  },

  // Get Post with Community Details
  getPostWithCommunity: async (postId) => {
    const post = await apiRequest(`/posts/${postId}`);
    
    // If the post has community_id but no community_name, fetch community details
    if (post.post && post.post.community_id && !post.post.community_name) {
      try {
        // Import communityApi dynamically to avoid circular imports
        const { communityApi } = await import('./communityApi');
        const communityResponse = await communityApi.getCommunityDetails(post.post.community_id);
        
        if (communityResponse.community) {
          post.post.community_name = communityResponse.community.community_name;
        }
      } catch (error) {
        console.error('Failed to fetch community details:', error);
        post.post.community_name = 'Unknown Community';
      }
    }
    
    return post;
  },

  // Search Posts (Public) - Updated to allow single character searches
  searchPosts: async (searchParams = {}) => {
    const queryParams = new URLSearchParams();
    
    // Clean and validate search query - now allow single characters
    if (searchParams.q) {
      const cleanQuery = searchParams.q.trim();
      if (cleanQuery.length >= 1) { // Changed from >= 2 to >= 1
        queryParams.append('q', cleanQuery);
      } else {
        // Return empty result for completely empty queries
        return {
          ok: true,
          count: 0,
          total: 0,
          page: 1,
          totalPages: 0,
          posts: []
        };
      }
    }
    
    if (searchParams.tags) queryParams.append('tags', searchParams.tags);
    if (searchParams.category) queryParams.append('category', searchParams.category);
    if (searchParams.page) queryParams.append('page', searchParams.page);
    if (searchParams.limit) queryParams.append('limit', searchParams.limit);
    
    console.log('Searching posts with params:', searchParams);
    console.log('Query string:', queryParams.toString());
    
    try {
      const response = await apiRequest(`/posts/search/query?${queryParams}`);
      console.log('Search posts response:', response);
      
      // Backend now handles all relevance scoring, just return the response
      return {
        ok: response.ok || true,
        count: response.count || 0,
        total: response.total || 0,
        page: response.page || 1,
        totalPages: response.totalPages || 0,
        posts: response.posts || []
      };
    } catch (error) {
      console.error('Search posts API error:', error);
      
      // Return empty results instead of throwing error for better UX
      return {
        ok: false,
        count: 0,
        total: 0,
        page: 1,
        totalPages: 0,
        posts: [],
        error: error.message
      };
    }
  },

  // Update Post (Protected)
  updatePost: async (postId, updateData) => {
    const userId = getUserIdFromTokenLocal();
    
    // Convert userId if needed
    let processedUserId = userId;
    if (!isNaN(userId) && !isNaN(parseFloat(userId))) {
      processedUserId = Number(userId);
    }
    
    const payload = {
      ...updateData,
      user_id: processedUserId
    };
    
    return await authenticatedRequest(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Delete Post (Protected)
  deletePost: async (postId) => {
    const userId = getUserIdFromTokenLocal();
    
    // Convert userId if needed
    let processedUserId = userId;
    if (!isNaN(userId) && !isNaN(parseFloat(userId))) {
      processedUserId = Number(userId);
    }
    
    return await authenticatedRequest(`/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: processedUserId })
    });
  },

  // Get Post Status (Protected)
  getPostStatus: async (postId) => {
    return await authenticatedRequest(`/posts/${postId}/status`);
  },

  // Like/Unlike Post (Protected)
  likePost: async (postId, userId) => {
    console.log('Liking post:', { postId, userId });
    
    try {
      // If caller didn't provide a userId, attempt to extract it from the token
      let processedUserId = userId;
      if (!processedUserId) processedUserId = getUserIdFromTokenLocal();
      if (!processedUserId) {
        console.error('likePost: no user id available');
        throw new Error('User ID required');
      }
      // Ensure user_id is a string for consistency with backend
      processedUserId = String(processedUserId);
      console.log('Processed user ID for liking post:', processedUserId);
      return await authenticatedRequest(`/posts/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ user_id: processedUserId })
      });
    } catch (error) {
      console.error('Like post API error:', error);
      
      // Handle schema mismatch error
      if (error.message.includes('upvotes') && error.message.includes('must be an array')) {
        console.warn('Detected upvotes schema mismatch. Post may need data migration.');
        throw new Error('This post has outdated data format. Please contact support to fix this issue.');
      }
      
      throw error;
    }
  },

  // Dislike/Remove Dislike Post (Protected)
  dislikePost: async (postId, userId) => {
    console.log('Disliking post:', { postId, userId });
    
    try {
      // If caller didn't provide a userId, attempt to extract it from the token
      let processedUserId = userId;
      if (!processedUserId) processedUserId = getUserIdFromTokenLocal();
      if (!processedUserId) {
        console.error('dislikePost: no user id available');
        throw new Error('User ID required');
      }
      // Ensure user_id is a string for consistency with backend
      processedUserId = String(processedUserId);

      return await authenticatedRequest(`/posts/${postId}/dislike`, {
        method: 'POST',
        body: JSON.stringify({ user_id: processedUserId })
      });
    } catch (error) {
      console.error('Dislike post API error:', error);
      
      // Handle schema mismatch error
      if (error.message.includes('downvotes') && error.message.includes('must be an array')) {
        console.warn('Detected downvotes schema mismatch. Post may need data migration.');
        throw new Error('This post has outdated data format. Please contact support to fix this issue.');
      }
      
      throw error;
    }
  },

  // Get Post Vote Status (Public/Protected)
  getPostVoteStatus: async (postId, userId = null) => {
    // Normalize user_id to string if provided
    const normalizedUserId = userId ? String(userId) : null;
    const queryParams = normalizedUserId ? `?user_id=${encodeURIComponent(normalizedUserId)}` : '';
    return await apiRequest(`/posts/${postId}/vote-status${queryParams}`);
  },

  // Get Post by ID with vote status (Enhanced)
  getPostByIdWithVotes: async (postId, userId = null) => {
    try {
      console.log('Fetching post with votes:', { postId, userId });
      
      // Get post details and vote status in parallel
      const [postResponse, voteResponse] = await Promise.all([
        postsApi.getPostById(postId),
        postsApi.getPostVoteStatus(postId, userId)
      ]);
      
      if (postResponse.ok && voteResponse.ok) {
        // Merge post data with vote information
        const enhancedPost = {
          ...postResponse.post,
          upvotes: voteResponse.upvotes || 0,
          downvotes: voteResponse.downvotes || 0,
          userLiked: voteResponse.userLiked || false,
          userDisliked: voteResponse.userDisliked || false
        };
        
        return { ...postResponse, post: enhancedPost };
      }
      
      return postResponse;
    } catch (error) {
      console.error('Error fetching post with votes:', error);
      throw error;
    }
  },
};