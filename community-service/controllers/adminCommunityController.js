import Community from '../models/Community.js';
import { cloudinary } from '../config/cloudinary.js';
import axios from 'axios';
import { createRedisClients } from "../../shared-config/redisClient.js";
const { pub } = await createRedisClients();

const HOST = process.env.HOST || 'http://localhost';
const POSTS_SERVICE_URL =
  process.env.POSTS_SERVICE_URL ||
  `${HOST}:${process.env.POSTS_SERVICE_PORT || process.env.POSTS_PORT || 5000}`;

const safeNumber = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const deleteImageIfNeeded = async (imageUrl) => {
  if (!imageUrl || imageUrl.includes('unsplash.com')) return;
  try {
    const parts = imageUrl.split('/');
    const publicIdWithExt = parts[parts.length - 1];
    const publicId = publicIdWithExt.split('.')[0];
    await cloudinary.uploader.destroy(`community-images/${publicId}`);
  } catch (err) {
    console.log('Skip image delete:', err.message);
  }
};

export const listCommunitiesAdmin = async (req, res) => {
  try {
    const page = safeNumber(req.query.page, 1);
    const limit = safeNumber(req.query.limit, 10);
    const { search, visible, owner } = req.query;
    const sortBy = ['createdAt', 'no_of_followers', 'no_of_posts', 'no_of_views', 'upvotes'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    const query = {};
    const andClauses = [];

    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      andClauses.push({ $or: [{ community_name: regex }, { description: regex }] });
    }

    if (owner && owner.trim()) {
      const ownerRegex = { $regex: owner.trim(), $options: 'i' };
      andClauses.push({
        $or: [
          { owner_username: ownerRegex },
          { owner_name: ownerRegex },
          { user_id: owner.trim() }
        ]
      });
    }

    if (visible) {
      query.visible = visible;
    }

    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    const [communities, total] = await Promise.all([
      Community.find(query)
        .sort({ [sortBy]: order })
        .skip((page - 1) * limit)
        .limit(limit),
      Community.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      data: communities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

export const getCommunityAdmin = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, message: 'Community not found' });
    }
    return res.json({ ok: true, community });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

export const getCommunityPostsAdmin = async (req, res) => {
  try {
    const { communityId } = req.params;
    const page = safeNumber(req.query.page, 1);
    const limit = safeNumber(req.query.limit, 10);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, message: 'Community not found' });
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const postIds = community.posts.slice(start, end);

    // Fetch full post details from posts-service
    let postsWithDetails = [];
    if (postIds && postIds.length > 0) {
      try {
        // Fetch each post's details from posts-service
        const postPromises = postIds.map(postId => 
          axios.get(`${POSTS_SERVICE_URL}/api/posts/${postId}`)
            .then(response => response.data?.post || response.data)
            .catch(err => {
              console.log(`Failed to fetch post ${postId}:`, err.message);
              return null; // Return null for failed fetches
            })
        );
        
        const fetchedPosts = await Promise.all(postPromises);
        // Filter out null values (failed fetches)
        postsWithDetails = fetchedPosts.filter(post => post !== null);
      } catch (err) {
        console.error('Error fetching post details:', err);
        // Continue with empty array if fetching fails
      }
    }

    return res.json({
      ok: true,
      community: {
        _id: community._id,
        community_name: community.community_name,
        no_of_posts: community.no_of_posts,
        posts: postsWithDetails, // Return full post objects instead of IDs
        totalPosts: community.posts.length,
      },
      pagination: {
        page,
        limit,
        total: community.posts.length,
        totalPages: Math.ceil(community.posts.length / limit) || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

export const addModeratorAdmin = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, message: 'Moderator userId is required' });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, message: 'Community not found' });
    }

    if (community.moderators.includes(userId)) {
      return res.status(400).json({ ok: false, message: 'User is already a moderator' });
    }

    const updated = await Community.findByIdAndUpdate(
      communityId,
      { $addToSet: { moderators: userId } },
      { new: true }
    );

    return res.json({ ok: true, message: 'Moderator added', community: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

export const removeModeratorAdmin = async (req, res) => {
  try {
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, message: 'Community not found' });
    }

    if (userId === community.user_id) {
      return res.status(400).json({ ok: false, message: 'Cannot remove community owner' });
    }

    const updated = await Community.findByIdAndUpdate(
      communityId,
      { $pull: { moderators: userId } },
      { new: true }
    );

    return res.json({ ok: true, message: 'Moderator removed', community: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

export const deleteCommunityAdmin = async (req, res) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ ok: false, message: 'Community not found' });
    }

    await deleteImageIfNeeded(community.image);
    await Community.deleteOne({ _id: communityId });

    await pub.publish(
      "dashboard:stats",
      JSON.stringify({
        type: "community_deleted" // or user_deleted, post_created, etc.
      })
    );
    return res.json({ ok: true, message: 'Community deleted' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};
