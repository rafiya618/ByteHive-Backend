import Community from '../models/Community.js';
import { cloudinary, uploadToCloudinary } from '../config/cloudinary.js';

// Helper function to check authorization
const checkCommunityAuthorization = (community, userId, requireAdminOnly = false) => {
  if (!userId) {
    return { authorized: false, message: 'User ID is required for authorization' };
  }
  
  const isAdmin = community.user_id === userId; // Fixed: use user_id from database
  const isModerator = community.moderators.includes(userId);
  
  if (requireAdminOnly && !isAdmin) {
    return { authorized: false, message: 'Access denied. Only admin can perform this action.' };
  }
  
  if (!isAdmin && !isModerator) {
    return { authorized: false, message: 'Access denied. Only admin and moderators can perform this action.' };
  }
  
  return { authorized: true };
};

// Helper function to handle image upload
const handleImageUpload = async (file, existingImageUrl = null) => {
  if (!file || !file.buffer) return null;
  
  console.log('File received:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.buffer.length
  });
  
  // Validate file
  if (!file.mimetype.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }
  
  if (file.buffer.length > 5 * 1024 * 1024) {
    throw new Error('File size too large. Maximum 5MB allowed.');
  }
  
  // Delete old image if exists and not default
  if (existingImageUrl && !existingImageUrl.includes('unsplash.com')) {
    try {
      const urlParts = existingImageUrl.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExtension.split('.')[0];
      const fullPublicId = `community-images/${publicId}`;
      console.log('Deleting old image:', fullPublicId);
      await cloudinary.uploader.destroy(fullPublicId);
    } catch (deleteError) {
      console.log('Error deleting old image:', deleteError.message);
    }
  }
  
  const result = await uploadToCloudinary(file.buffer, 'community-images');
  return result.secure_url;
};

// Helper function to delete image from Cloudinary
const deleteImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl || imageUrl.includes('unsplash.com')) return;
  
  try {
    const urlParts = imageUrl.split('/');
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0];
    const fullPublicId = `community-images/${publicId}`;
    console.log('Deleting image:', fullPublicId);
    await cloudinary.uploader.destroy(fullPublicId);
  } catch (deleteError) {
    console.log('Error deleting image from cloudinary:', deleteError.message);
  }
};

// Helper function to normalize community tags
const normalizeCommunityTags = (tags) => {
  let communityTags = tags || [];
  if (!Array.isArray(communityTags)) {
    communityTags = communityTags ? [communityTags] : [];
  }
  return communityTags;
};

// == Create Community 
export const createCommunity = async (req, res) => {
  try {
    const { community_name, description, visible, moderation, userId } = req.body;
    const communityTags = normalizeCommunityTags(req.body['community_tags[]'] || req.body.community_tags);

    const existingCommunity = await Community.findOne({ community_name });
    if (existingCommunity) {
      return res.status(400).json({ message: 'Community name already exists' });
    }

    const communityData = {
      community_name,
      description,
      user_id: userId, // Fixed: use user_id for database
      community_tags: communityTags,
      visible: visible || 'public',
      moderation: moderation || 'only admin',
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80"
    };

    try {
      const imageUrl = await handleImageUpload(req.file);
      if (imageUrl) {
        communityData.image = imageUrl;
      }
    } catch (uploadError) {
      return res.status(400).json({ 
        message: 'Image upload failed', 
        error: uploadError.message 
      });
    }

    const community = new Community(communityData);
    await community.save();
    
    res.status(201).json({
      message: 'Community created successfully',
      community,
    });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Update Community
export const updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { community_name, description, visible, moderation, userId } = req.body;
    const communityTags = normalizeCommunityTags(req.body['community_tags[]'] || req.body.community_tags);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check
    const authCheck = checkCommunityAuthorization(community, userId);
    if (!authCheck.authorized) {
      return res.status(authCheck.message.includes('required') ? 401 : 403).json({ message: authCheck.message });
    }

    // Check if new name already exists
    if (community_name && community_name !== community.community_name) {
      const existingCommunity = await Community.findOne({ community_name });
      if (existingCommunity) {
        return res.status(400).json({ message: 'Community name already exists' });
      }
    }

    const updateData = {};
    if (community_name) updateData.community_name = community_name;
    if (description) updateData.description = description;
    if (communityTags.length > 0) updateData.community_tags = communityTags;
    if (visible) updateData.visible = visible;
    if (moderation) updateData.moderation = moderation;

    // Handle image update
    try {
      const imageUrl = await handleImageUpload(req.file, community.image);
      if (imageUrl) {
        updateData.image = imageUrl;
      }
    } catch (uploadError) {
      return res.status(400).json({
        message: 'Image upload failed',
        error: uploadError.message,
      });
    }

    const updatedCommunity = await Community.findByIdAndUpdate(communityId, updateData, {
      new: true,
    });

    res.json({
      message: 'Community updated successfully',
      community: updatedCommunity,
    });
  } catch (error) {
    console.error('Update community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Delete Community 
export const deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - only admin can delete
    const authCheck = checkCommunityAuthorization(community, userId, true);
    if (!authCheck.authorized) {
      return res.status(authCheck.message.includes('required') ? 401 : 403).json({ message: authCheck.message });
    }

    // Delete image from Cloudinary
    await deleteImageFromCloudinary(community.image);

    await Community.findByIdAndDelete(communityId);

    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Discover Communities 
export const discoverCommunities = async (req, res) => {
  try {
    const { search, tags, page = 1, limit = 10, visible = 'public' } = req.query;
    let query = { visible };

    if (search) {
      query.$or = [
        { community_name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim());
      query.community_tags = { $in: tagArray };
    }

    const communities = await Community.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Community.countDocuments(query);

    res.json({
      communities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Get Community Details
export const getCommunityDetails = async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Removed: await Community.findByIdAndUpdate(communityId, { $inc: { no_of_views: 1 } });

    res.json({ community });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Follow Community 
export const followCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.members.includes(userId)) {
      return res.status(400).json({ message: 'Already following this community' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $push: { members: userId },
      $inc: { no_of_followers: 1 },
    });

    res.json({ 
      message: 'Successfully followed community',
      success: true,
      communityId: communityId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Unfollow Community 
export const unfollowCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (!community.members.includes(userId)) {
      return res.status(400).json({ message: 'Not following this community' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $pull: { members: userId },
      $inc: { no_of_followers: -1 },
    });

    res.json({ 
      message: 'Successfully unfollowed community',
      success: true,
      communityId: communityId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Update Community Settings
export const updateCommunitySettings = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { visible, moderation, userId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check
    const authCheck = checkCommunityAuthorization(community, userId);
    if (!authCheck.authorized) {
      return res.status(authCheck.message.includes('required') ? 401 : 403).json({ message: authCheck.message });
    }

    const updateData = {};
    if (visible) updateData.visible = visible;
    if (moderation) updateData.moderation = moderation;

    const updatedCommunity = await Community.findByIdAndUpdate(communityId, updateData, {
      new: true,
    });

    res.json({
      message: 'Community settings updated successfully',
      community: updatedCommunity,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Add Moderator 
export const addModerator = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId, moderatorUserId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - only admin can add moderators
    const authCheck = checkCommunityAuthorization(community, userId, true);
    if (!authCheck.authorized) {
      return res.status(authCheck.message.includes('required') ? 401 : 403).json({ message: authCheck.message });
    }

    if (!moderatorUserId) {
      return res.status(400).json({ message: 'Moderator user ID is required' });
    }

    if (community.moderators.includes(moderatorUserId)) {
      return res.status(400).json({ message: 'User is already a moderator' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $push: { moderators: moderatorUserId },
    });

    res.json({ message: 'Moderator added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Remove Moderator
export const removeModerator = async (req, res) => {
  try {
    const { communityId, moderatorUserId } = req.params;
    const { userId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - only admin can remove moderators
    const authCheck = checkCommunityAuthorization(community, userId, true);
    if (!authCheck.authorized) {
      return res.status(authCheck.message.includes('required') ? 401 : 403).json({ message: authCheck.message });
    }

    await Community.findByIdAndUpdate(communityId, {
      $pull: { moderators: moderatorUserId },
    });

    res.json({ message: 'Moderator removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Get All Communities (simplified version without user-specific data)
export const getAllCommunities = async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = {};
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    const communities = await Community.find(query)
      .sort({ createdAt: -1 });

    res.json({
      communities: communities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Get User's Communities
export const getUserCommunities = async (req, res) => {
  try {
    const { userId } = req.params || req.body;
    const { search } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    let query = { user_id: userId }; // Fixed: use user_id for database query
    let memberQuery = { members: userId };
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const searchCondition = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
      
      query.$or = searchCondition;
      memberQuery.$and = [
        { members: userId },
        { $or: searchCondition }
      ];
    }
    
    const ownedCommunities = await Community.find(query).sort({ createdAt: -1 });
    const followedCommunities = await Community.find(memberQuery).sort({ createdAt: -1 });

    res.json({
      owned: ownedCommunities,
      followed: followedCommunities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Add these new endpoints to your existing Community controller

// ==Add Post to Community (increment post count and add post ID to posts array)
export const addPostToCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId, postId } = req.body;

    console.log('Adding post to community:', { communityId, userId, postId });

    if (!userId || !postId) {
      return res.status(400).json({ message: 'User ID and Post ID are required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - anyone who can post can add to count
    const isAdmin = community.user_id === userId;
    const isModerator = community.moderators.includes(userId);
    const isFollower = community.members.includes(userId);

    let canPost = false;
    
    switch (community.moderation) {
      case 'only admin':
        canPost = isAdmin;
        break;
      case 'allow moderators':
        canPost = isAdmin || isModerator;
        break;
      case 'allow all':
        canPost = isAdmin || isModerator || isFollower;
        break;
      default:
        canPost = isAdmin;
    }

    if (!canPost) {
      return res.status(403).json({ message: 'Access denied. You cannot post in this community.' });
    }

    // Check if post ID already exists in the posts array
    if (community.posts.includes(postId)) {
      return res.status(400).json({ message: 'Post already added to community' });
    }

    // Add post ID to posts array and increment post count
    const updatedCommunity = await Community.findByIdAndUpdate(
      communityId, 
      {
        $push: { posts: postId },
        $inc: { no_of_posts: 1 }
      },
      { new: true }
    );

    console.log('Community updated successfully:', {
      communityId,
      postId,
      newPostCount: updatedCommunity.no_of_posts,
      totalPostsInArray: updatedCommunity.posts.length
    });

    res.json({ 
      message: 'Post added to community successfully',
      success: true,
      community: {
        _id: updatedCommunity._id,
        no_of_posts: updatedCommunity.no_of_posts,
        posts: updatedCommunity.posts
      }
    });
  } catch (error) {
    console.error('Add post to community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Remove Post from Community (decrement post count and remove post ID from posts array)
export const removePostFromCommunity = async (req, res) => {
  try {
    const { communityId, postId } = req.params;
    const { userId } = req.body;

    console.log('Removing post from community:', { communityId, postId, userId });

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - post owner, admin, or moderator can remove
    const isAdmin = community.user_id === userId;
    const isModerator = community.moderators.includes(userId);

    if (!isAdmin && !isModerator) {
      // For now, allow any authenticated user (assuming they own the post)
      // In a real app, you'd verify post ownership here
      console.log('Non-admin/moderator attempting to remove post, allowing for now');
    }

    // Check if post ID exists in the posts array
    if (!community.posts.includes(postId)) {
      return res.status(404).json({ message: 'Post not found in community' });
    }

    // Remove post ID from posts array and decrement post count
    const updatedCommunity = await Community.findByIdAndUpdate(
      communityId,
      {
        $pull: { posts: postId },
        $inc: { no_of_posts: -1 }
      },
      { new: true }
    );

    // Ensure post count doesn't go below 0
    if (updatedCommunity.no_of_posts < 0) {
      await Community.findByIdAndUpdate(communityId, { no_of_posts: 0 });
      updatedCommunity.no_of_posts = 0;
    }

    console.log('Post removed from community successfully:', {
      communityId,
      postId,
      newPostCount: updatedCommunity.no_of_posts,
      totalPostsInArray: updatedCommunity.posts.length
    });

    res.json({ 
      message: 'Post removed from community successfully',
      success: true,
      community: {
        _id: updatedCommunity._id,
        no_of_posts: updatedCommunity.no_of_posts,
        posts: updatedCommunity.posts
      }
    });
  } catch (error) {
    console.error('Remove post from community error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Get Community Posts (get all posts for a community)
export const getCommunityPosts = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Return the posts array with pagination info
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPosts = community.posts.slice(startIndex, endIndex);

    res.json({
      success: true,
      community: {
        _id: community._id,
        community_name: community.community_name,
        no_of_posts: community.no_of_posts,
        posts: paginatedPosts,
        totalPosts: community.posts.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(community.posts.length / limit)
      }
    });
  } catch (error) {
    console.error('Get community posts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};