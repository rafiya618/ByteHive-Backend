import { jwtDecode } from 'jwt-decode';

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

// Get authorization headers for API requests
export const getAuthHeaders = () => {
  const authData = localStorage.getItem('Auth');
  if (!authData) {
    throw new AuthError('No token, authorization denied');
  }
  
  try {
    const parsed = JSON.parse(authData);
    const token = parsed.token;
    
    if (!token) {
      throw new AuthError('No token, authorization denied');
    }
    
    return {
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    throw new AuthError('Invalid token format, authorization denied');
  }
};

// Extract user ID from JWT token
export const getUserIdFromToken = () => {
  const authData = localStorage.getItem('Auth');
  if (!authData) {
    throw new AuthError('No auth data found');
  }
  
  try {
    const parsed = JSON.parse(authData);
    if (!parsed.token) {
      throw new AuthError('No token found');
    }
    
    const decoded = jwtDecode(parsed.token);
    const userId = decoded._id || decoded.id || decoded.user_id || decoded.userId;
    
    if (!userId) {
      throw new AuthError('User ID not found in token');
    }
    
    return userId;
  } catch (error) {
    throw new AuthError('Invalid auth token');
  }
};

// Check if user can edit community (owner or moderator)
export const canEditCommunity = (community, currentUserId) => {
  if (!currentUserId || !community) return false;
  
  // Handle both userId and user_id field names
  const communityUserId = community.userId || community.user_id;
  const isOwner = communityUserId === currentUserId;
  const isModerator = community.moderators && community.moderators.includes(currentUserId);
  
  return isOwner || isModerator;
};

// Check if user can delete community (only owner)
export const canDeleteCommunity = (community, currentUserId) => {
  if (!currentUserId || !community) return false;
  
  // Handle both userId and user_id field names
  const communityUserId = community.userId || community.user_id;
  return communityUserId === currentUserId;
};

// Check if user is owner of community
export const isOwnerOfCommunity = (community, currentUserId) => {
  if (!currentUserId || !community) return false;
  
  // Handle both userId and user_id field names
  const communityUserId = community.userId || community.user_id;
  return communityUserId === currentUserId;
};
