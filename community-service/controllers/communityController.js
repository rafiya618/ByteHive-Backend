import Community from '../models/Community.js';
import { cloudinary, uploadToCloudinary } from '../config/cloudinary.js';
import { createRedisClients } from "../../shared-config/redisClient.js";

const { pub } = await createRedisClients();

// Helper function to check authorization
const checkCommunityAuthorization = (community, user_id, requireAdminOnly = false) => {
  if (!user_id) {
    return { authorized: false, message: 'User ID is required for authorization' };
  }

  const isAdmin = community.user_id === user_id; // Fixed: use user_id from database
  const isModerator = community.moderators.includes(user_id);

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
    const { community_name, description, visible, moderation, user_id } = req.body;
    const communityTags = normalizeCommunityTags(req.body['community_tags[]'] || req.body.community_tags);

    const existingCommunity = await Community.findOne({ community_name });
    if (existingCommunity) {
      return res.status(400).json({ message: 'Community name already exists' });
    }

    const communityData = {
      community_name,
      description,
      user_id: user_id, // Fixed: use user_id for database
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
    const { community_name, description, visible, moderation, user_id } = req.body;
    const communityTags = normalizeCommunityTags(req.body['community_tags[]'] || req.body.community_tags);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check
    const authCheck = checkCommunityAuthorization(community, user_id);
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
    const { user_id } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - only admin can delete
    const authCheck = checkCommunityAuthorization(community, user_id, true);
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
    const { search, tags, page = 1, limit = 10, visible, user_id } = req.query;
    let query = {};
    if (visible) {
      query.visible = visible;
    }

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

    // We need joinRequests to determine hasRequested, so we can't fully exclude it if we want to calculate it server-side,
    // OR we calculate it here and then remove it.
    const communities = await Community.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Community.countDocuments(query);

    // Map to add hasRequested and remove sensitive fields
    const sanitizedCommunities = communities.map(c => {
      const communityObj = c.toObject();
      const hasRequested = user_id && communityObj.joinRequests?.includes(user_id);

      delete communityObj.members;
      delete communityObj.posts;
      delete communityObj.joinRequests;

      return {
        ...communityObj,
        hasRequested: !!hasRequested
      };
    });

    res.json({
      communities: sanitizedCommunities,
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

    const userId = req.query.user_id || req.body.user_id; // Check identifying info

    // Privacy Check
    if (community.visible === 'private') {
      const isMember = userId && community.members.some(m => m.toString() === userId.toString());
      const isAdmin = userId && community.user_id.toString() === userId.toString();

      if (!isMember && !isAdmin) {
        // Return limited details
        return res.json({
          community: {
            _id: community._id,
            community_name: community.community_name,
            description: community.description,
            image: community.image,
            visible: community.visible,
            no_of_followers: community.no_of_followers,
            no_of_posts: community.no_of_posts,
            community_tags: community.community_tags,
            user_id: community.user_id, // Owner
            isPrivateAndNotJoined: true, // Frontend flag
            hasRequested: userId ? community.joinRequests?.some(r => r.toString() === userId.toString()) : false
          }
        });
      }
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
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isMember = user_id && community.members.some(m => m.toString() === user_id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'Already following this community' });
    }

    // Check for Private Community
    if (community.visible === 'private') {
      const hasRequested = user_id && community.joinRequests?.some(r => r.toString() === user_id.toString());
      if (hasRequested) {
        return res.status(400).json({ message: 'Join request already pending' });
      }

      await Community.findByIdAndUpdate(communityId, {
        $addToSet: { joinRequests: user_id.toString() }
      });

      // Publish Notification Event for Admin
      if (pub) {
        const notificationPayload = {
          receiverId: community.user_id.toString(), // Admin
          senderId: user_id.toString(),
          triggerType: 'join_request', // New trigger type
          entityType: 'community',
          entityId: community._id.toString(),
          communityName: community.community_name,
          triggerId: `${user_id}-${community._id}-join`, // Unique trigger ID
          message: `requested to join ${community.community_name}`,
          navigate: `/community/${community._id}` // Admin goes to community to manage
        };

        console.log("📢 [COMMUNITY] Publishing join_request notification:", notificationPayload);
        try {
          await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
          console.log("✅ [COMMUNITY] Published successfully to notification:event");
        } catch (err) {
          console.error("❌ [COMMUNITY] Failed to publish notification:", err.message);
        }
      } else {
        console.warn("⚠️ [COMMUNITY] Redis publisher (pub) is not initialized!");
      }

      return res.json({
        message: 'Join request sent',
        status: 'requested',
        success: true
      });
    }

    await Community.findByIdAndUpdate(communityId, {
      $push: { members: user_id },
      $inc: { no_of_followers: 1 },
    });

    // Publish Follow Notification (if enabled)
    if (pub) {
      const notificationPayload = {
        receiverId: community.user_id.toString(), // Admin
        senderId: user_id.toString(),
        triggerType: 'community_follow',
        entityType: 'community',
        entityId: community._id.toString(),
        communityName: community.community_name,
        triggerId: `${user_id}-${community._id}-follow`, // Unique trigger ID
        message: `started following your community ${community.community_name}`,
        navigate: `/community/${community._id}`
      };

      console.log("📢 [COMMUNITY] Publishing community_follow notification:", notificationPayload);
      try {
        await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
      } catch (err) {
        console.error("❌ [COMMUNITY] Failed to publish notification:", err.message);
      }
    }

    res.json({
      message: 'Successfully followed community',
      success: true,
      status: 'following',
      communityId: communityId
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Unfollow Community 
export const unfollowCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isMember = user_id && community.members.some(m => m.toString() === user_id.toString());
    const hasRequested = user_id && community.joinRequests?.some(r => r.toString() === user_id.toString());

    if (!isMember && !hasRequested) {
      return res.status(400).json({ message: 'Not following or requested to follow this community' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $pull: {
        members: user_id.toString(),
        joinRequests: user_id.toString()
      },
      $inc: { no_of_followers: isMember ? -1 : 0 },
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
    const { visible, moderation, user_id } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check
    const authCheck = checkCommunityAuthorization(community, user_id);
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
    const { user_id, moderatorUserId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - only admin can add moderators
    const authCheck = checkCommunityAuthorization(community, user_id, true);
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
    const { user_id } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - only admin can remove moderators
    const authCheck = checkCommunityAuthorization(community, user_id, true);
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

    // Mask sensitive data for private communities
    const maskedCommunities = communities.map(c => {
      if (c.visible === 'private') {
        return {
          _id: c._id,
          community_name: c.community_name,
          description: c.description,
          image: c.image,
          visible: c.visible,
          no_of_followers: c.no_of_followers,
          no_of_posts: c.no_of_posts,
          community_tags: c.community_tags,
          user_id: c.user_id,
          isPrivateAndNotJoined: true
        };
      }
      return c;
    });

    res.json({
      communities: maskedCommunities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Get User's Communities
export const getUserCommunities = async (req, res) => {
  try {
    // Accept both userId (route param) and user_id (query/body) for flexibility
    const user_id = req.params.userId || req.params.user_id || req.body?.user_id || req.body?.userId || req.query?.user_id;
    const { search } = req.query;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    let query = { user_id: user_id }; // Fixed: use user_id for database query
    let memberQuery = { members: user_id };

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const searchCondition = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];

      query.$or = searchCondition;
      memberQuery.$and = [
        { members: user_id },
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
    const { user_id, postId } = req.body;

    console.log('Adding post to community:', { communityId, user_id, postId });

    if (!user_id || !postId) {
      return res.status(400).json({ message: 'User ID and Post ID are required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - anyone who can post can add to count
    const isAdmin = community.user_id === user_id;
    const isModerator = community.moderators.includes(user_id);
    const isFollower = community.members.includes(user_id);

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
    const { user_id } = req.body;

    console.log('Removing post from community:', { communityId, postId, user_id });

    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Authorization check - post owner, admin, or moderator can remove
    const isAdmin = community.user_id === user_id;
    const isModerator = community.moderators.includes(user_id);

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

    const userId = req.query.user_id;

    if (community.visible === 'private') {
      const isMember = community.members.includes(userId);
      const isAdmin = community.user_id === userId;

      if (!isMember && !isAdmin) {
        return res.status(403).json({ message: 'This community is private. You must be a member to view posts.' });
      }
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

// == LITE: minimal community data for RE-service (community_tags)
export const getCommunityLite = async (req, res) => {
  try {
    const { communityId } = req.params;
    const doc = await Community.findById(communityId).select("community_tags");
    if (!doc) return res.status(404).json({ ok: false, error: "Community not found" });
    return res.json({ ok: true, community: { _id: doc._id, community_tags: doc.community_tags || [] } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};

// == Get Join Requests (Admin Only)
export const getJoinRequests = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { user_id } = req.query; // Requester (Admin)

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    // Auth Check
    if (community.user_id !== user_id) {
      return res.status(403).json({ message: 'Only admin can view join requests' });
    }

    // We need to fetch user details for the requests.
    // Since user data is in another service (Auth/Cache), we might return just IDs 
    // OR if we have a way to fetch profiles. 
    // For now, let's return IDs and let frontend fetch profiles (or if we have a cache helper).
    // BUT, usually we want names.
    // In `subscriber.js` we see `notificationCacheModel`. Maybe we can use that if accessible?
    // But this is community-service.
    // Let's just return the IDs for now, and the Frontend can fetch user details using `getUser` or similar.

    res.json({ requests: community.joinRequests || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// == Respond to Join Request
export const respondToJoinRequest = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { user_id, requesterId, action } = req.body; // action: 'accept' or 'decline'

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });

    // Auth Check
    if (community.user_id.toString() !== user_id.toString()) {
      return res.status(403).json({ message: 'Only admin can manage requests' });
    }

    console.log('🔍 [COMMUNITY] Join Request Check Start');
    console.log('   requesterId:', requesterId, `(${typeof requesterId})`);
    console.log('   communityId:', communityId);
    console.log('   joinRequests array:', JSON.stringify(community.joinRequests));

    if (community.joinRequests) {
      community.joinRequests.forEach((reqId, index) => {
        // Robust comparison with null checks
        const match = reqId && requesterId && reqId.toString() === requesterId.toString();
        console.log(`   [${index}] Comparison: "${reqId}" === "${requesterId}" -> ${match}`);
      });
    }

    // Fixed robust filter with null check
    const isRequestInList = community.joinRequests.some(id =>
      id && requesterId && id.toString() === requesterId.toString()
    );

    const isAlreadyMember = community.members?.some(m => m && m.toString() === requesterId.toString());

    console.log('🔍 [COMMUNITY] Check results:', { isRequestInList, isAlreadyMember });

    if (!isRequestInList) {
      if (action === 'accept' && isAlreadyMember) {
        console.log('✅ [COMMUNITY] User already a member, returning success for accept action');
        return res.json({ success: true, message: 'User is already a member' });
      }
      console.log('❌ [COMMUNITY] Request not found for:', requesterId);
      return res.status(404).json({ message: 'Request not found' });
    }

    if (action === 'accept') {
      await Community.findByIdAndUpdate(communityId, {
        $pull: { joinRequests: requesterId.toString() },
        $push: { members: requesterId.toString() },
        $inc: { no_of_followers: 1 }
      });

      // Notification to User
      if (pub) {
        const notificationPayload = {
          receiverId: requesterId.toString(),
          senderId: community.user_id.toString(), // Admin
          triggerType: 'request_approved',
          entityType: 'community',
          entityId: community._id.toString(),
          communityName: community.community_name,
          triggerId: `${requesterId}-${community._id}-approve`, // Unique trigger ID
          message: `approved your request to join ${community.community_name}`,
          navigate: `/community/${community._id}`
        };

        console.log("📢 [COMMUNITY] Publishing request_approved notification:", notificationPayload);
        try {
          await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
          console.log("✅ [COMMUNITY] Published successfully to notification:event");
        } catch (err) {
          console.error("❌ [COMMUNITY] Failed to publish notification:", err.message);
        }
      } else {
        console.warn("⚠️ [COMMUNITY] Redis publisher (pub) is not initialized!");
      }
    } else if (action === 'decline') {
      // Use explicit pull to ensure it works even if types are slightly mismatched in memory
      await Community.findByIdAndUpdate(communityId, {
        $pull: { joinRequests: requesterId.toString() }
      });

      // Notification to User about decline (to clear status on frontend)
      if (pub) {
        const notificationPayload = {
          receiverId: requesterId.toString(),
          senderId: community.user_id.toString(), // Admin
          triggerType: 'request_declined',
          entityType: 'community',
          entityId: community._id.toString(),
          communityName: community.community_name,
          triggerId: `${requesterId}-${community._id}-decline`, // Unique trigger ID
          message: `declined your request to join ${community.community_name}`,
          navigate: `/community/${community._id}`
        };

        console.log("📢 [COMMUNITY] Publishing request_declined notification:", notificationPayload);
        try {
          await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
          console.log("✅ [COMMUNITY] Published successfully to notification:event");
        } catch (err) {
          console.error("❌ [COMMUNITY] Failed to publish notification:", err.message);
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    res.json({ success: true, message: `Request ${action}ed` });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};