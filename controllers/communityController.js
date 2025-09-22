import Community from '../models/Community.js';
import User from '../models/User.js';
import { cloudinary, uploadToCloudinary } from '../config/cloudinary.js';

// == Create Community 
export const createCommunity = async (req, res) => {
  try {
    const { community_name, description, visible, moderation } = req.body;
    let community_tags = req.body['community_tags[]'] || req.body.community_tags || [];
    
    // Ensure community_tags is always an array
    if (!Array.isArray(community_tags)) {
      community_tags = community_tags ? [community_tags] : [];
    }
    
    // Check if community name already exists
    const existingCommunity = await Community.findOne({ community_name });
    if (existingCommunity) {
      return res.status(400).json({ message: 'Community name already exists' });
    }

    const communityData = {
      community_name,
      description,
      user_id: req.user._id,
      community_tags: community_tags,
      visible: visible || 'public',
      moderation: moderation || 'only admin',
    };

    // Handle image upload or set default
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        communityData.image = result.secure_url;
      } catch (uploadError) {
        return res.status(400).json({ message: 'Image upload failed', error: uploadError.message });
      }
    } else {
      // Set default avatar if no image provided
      communityData.image = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80";
    }

    const community = new Community(communityData);
    await community.save();

    await community.populate('user_id', 'username email');
    
    res.status(201).json({
      message: 'Community created successfully',
      community,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Update Community
export const updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { community_name, description, visible, moderation } = req.body;
    let community_tags = req.body['community_tags[]'] || req.body.community_tags || [];
    
    // Ensure community_tags is always an array
    if (!Array.isArray(community_tags)) {
      community_tags = community_tags ? [community_tags] : [];
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin
    if (community.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Check if new name already exists (only if name is being changed)
    if (community_name && community_name !== community.community_name) {
      const existingCommunity = await Community.findOne({ community_name });
      if (existingCommunity) {
        return res.status(400).json({ message: 'Community name already exists' });
      }
    }

    const updateData = {};
    if (community_name) updateData.community_name = community_name;
    if (description) updateData.description = description;
    if (community_tags.length > 0) updateData.community_tags = community_tags;
    if (visible) updateData.visible = visible;
    if (moderation) updateData.moderation = moderation;

    // Handle image update
    if (req.file) {
      try {
        // Delete old image from Cloudinary if it's not the default
        if (community.image && !community.image.includes('unsplash.com')) {
          const publicId = community.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`community-images/${publicId}`);
        }
        const result = await uploadToCloudinary(req.file.buffer);
        updateData.image = result.secure_url;
      } catch (uploadError) {
        return res.status(400).json({
          message: 'Image upload failed',
          error: uploadError.message,
        });
      }
    }

    const updatedCommunity = await Community.findByIdAndUpdate(communityId, updateData, {
      new: true,
    }).populate('user_id', 'username email');

    res.json({
      message: 'Community updated successfully',
      community: updatedCommunity,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Delete Community 
export const deleteCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin
    if (community.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Delete image from Cloudinary if exists
    if (community.image) {
      try {
        const publicId = community.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`community-images/${publicId}`);
      } catch (deleteError) {
        console.log('Error deleting image from cloudinary:', deleteError.message);
      }
    }

    await Community.findByIdAndDelete(communityId);

    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
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
      .populate('user_id', 'username')
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

    const community = await Community.findById(communityId)
      .populate('user_id', 'username email')
      .populate('members', 'username')
      .populate('moderators', 'username');

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Increment view count
    await Community.findByIdAndUpdate(communityId, { $inc: { no_of_views: 1 } });

    res.json({ community });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Follow Community 
export const followCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user._id;

    // Handle dummy community IDs that start with 'discover-'
    if (communityId.startsWith('discover-') || communityId.startsWith('owned-')) {
      // For dummy communities, just return success
      return res.json({ 
        message: 'Successfully followed community',
        success: true,
        communityId: communityId
      });
    }

    // For real communities in database
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if already following
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
    const userId = req.user._id;

    // Handle dummy community IDs
    if (communityId.startsWith('discover-') || communityId.startsWith('owned-')) {
      // For dummy communities, just return success
      return res.json({ 
        message: 'Successfully unfollowed community',
        success: true,
        communityId: communityId
      });
    }

    // For real communities in database
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if not following
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
    const { visible, moderation } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin
    if (community.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
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
    const { username } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin
    if (community.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already a moderator
    if (community.moderators.includes(user._id)) {
      return res.status(400).json({ message: 'User is already a moderator' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $push: { moderators: user._id },
    });

    res.json({ message: 'Moderator added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ==Remove Moderator
export const removeModerator = async (req, res) => {
  try {
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin
    if (community.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    await Community.findByIdAndUpdate(communityId, {
      $pull: { moderators: userId },
    });

    res.json({ message: 'Moderator removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// == Get User's Communities
export const getUserCommunities = async (req, res) => {
  try {
    const userId = req.user._id;
    const { search } = req.query;
    
    let query = { user_id: userId };
    let memberQuery = { members: userId };
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
      memberQuery.$or = [
        { community_name: searchRegex },
        { description: searchRegex }
      ];
      // Keep the member condition
      memberQuery.$and = [
        { members: userId },
        { $or: memberQuery.$or }
      ];
      delete memberQuery.$or;
    }
    
    const ownedCommunities = await Community.find(query)
      .populate('user_id', 'username')
      .sort({ createdAt: -1 });

    const followedCommunities = await Community.find(memberQuery)
      .populate('user_id', 'username')  
      .sort({ createdAt: -1 });

    res.json({
      owned: ownedCommunities,
      followed: followedCommunities,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};