import Post from '../models/Post.js';
import axios from 'axios';
import { createRedisClients } from "../../shared-config/redisClient.js";
const { pub } = await createRedisClients();
const safeNumber = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

/**
 * 4.1 - Get all posts with filters and pagination
 * Query params: page, limit, search, community, category, status, sortBy, order
 * Displays: title, author name, date, status, category, engagement count
 */
export const listPostsAdmin = async (req, res) => {
  try {
    console.log('Enter in post admin controller') 
    const page = safeNumber(req.query.page, 1);
    const limit = safeNumber(req.query.limit, 10);
    const { search, community, category, status, sortBy: sortByParam, order: orderParam } = req.query;

    // Validate sortBy - can sort by engagement (upvotes+downvotes+comments+views)
    const validSortFields = ['createdAt', 'date', 'views', 'comments', 'upvotes'];
    const sortBy = validSortFields.includes(sortByParam) ? sortByParam : 'createdAt';
    const order = orderParam === 'asc' ? 1 : -1;

    const query = {};
    const andClauses = [];

    // Search by title or description
    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      andClauses.push({
        $or: [
          { post_title: regex },
          { post_description: regex },
          { small_description: regex }
        ]
      });
    }

    // Filter by community
    if (community && community.trim()) {
      query.community = community.trim();
    }

    // Filter by category
    if (category && category.trim()) {
      query.category = category.trim();
    }

    // Filter by status
    if (status && status.trim()) {
      if (['pending_review', 'approved', 'rejected'].includes(status.trim())) {
        query.status = status.trim();
      }
    }

    // Combine filters
    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    // Fetch posts with pagination
    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ [sortBy]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    // Enrich posts with engagement count and author name (simulate if needed)
    const enrichedPosts = posts.map((post) => {
      const engagementCount = (post.upvotes?.length || 0) + 
                             (post.downvotes?.length || 0) + 
                             (post.comments || 0) + 
                             (post.views || 0);
      return {
        _id: post._id,
        post_title: post.post_title,
        author_id: post.user_id,
        author_username: post.author_username || "Anonymous",
        date: post.date || post.createdAt,
        status: post.status,
        category: post.category,
        community: post.community,
        engagement_count: engagementCount,
        upvotes: post.upvotes?.length || 0,
        downvotes: post.downvotes?.length || 0,
        comments: post.comments || 0,
        views: post.views || 0
      };
    });

    return res.json({
      ok: true,
      data: enrichedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error in listPostsAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * Get single post details for admin view
 */
export const getPostDetailsAdmin = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).lean();
    if (!post) {
      return res.status(404).json({ ok: false, message: 'Post not found' });
    }

    const engagementCount = (post.upvotes?.length || 0) + 
                           (post.downvotes?.length || 0) + 
                           (post.comments || 0) + 
                           (post.views || 0);

    return res.json({
      ok: true,
      post: {
        ...post,
        engagement_count: engagementCount,
        upvotes_count: post.upvotes?.length || 0,
        downvotes_count: post.downvotes?.length || 0,
      }
    });
  } catch (err) {
    console.error('Error in getPostDetailsAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * 4.3.1 - Approve a pending post
 */
export const approvePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ ok: false, message: 'Post not found' });
    }

    if (post.status !== 'pending_review') {
      return res.status(400).json({ ok: false, message: 'Only pending posts can be approved' });
    }

    post.status = 'approved';
    await post.save();

    // Optionally notify user
    try {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003';
      await axios.post(
        `${notificationUrl}/api/notifications`,
        {
          user_id: post.user_id,
          notification_type: 'post_approved',
          post_id: post._id.toString(),
          message: `Your post "${post.post_title}" has been approved!`
        },
        { timeout: 5000 }
      );
    } catch (notifyErr) {
      console.warn('Failed to send approval notification:', notifyErr.message);
    }

    return res.json({
      ok: true,
      message: 'Post approved successfully',
      post
    });
  } catch (err) {
    console.error('Error in approvePost:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * 4.3.2 - Reject a pending post
 */
export const rejectPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ ok: false, message: 'Post not found' });
    }

    if (post.status !== 'pending_review') {
      return res.status(400).json({ ok: false, message: 'Only pending posts can be rejected' });
    }

    post.status = 'rejected';
    await post.save();

    // Optionally notify user with rejection reason
    try {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003';
      await axios.post(
        `${notificationUrl}/api/notifications`,
        {
          user_id: post.user_id,
          notification_type: 'post_rejected',
          post_id: post._id.toString(),
          message: `Your post "${post.post_title}" was rejected. Reason: ${reason || 'Content does not meet guidelines.'}`
        },
        { timeout: 5000 }
      );
    } catch (notifyErr) {
      console.warn('Failed to send rejection notification:', notifyErr.message);
    }

    return res.json({
      ok: true,
      message: 'Post rejected successfully',
      post
    });
  } catch (err) {
    console.error('Error in rejectPost:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * 4.3.3 - Delete a post
 */
export const deletePostAdmin = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ ok: false, message: 'Post not found' });
    }

    // Optionally notify user of deletion
    try {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003';
      await axios.post(
        `${notificationUrl}/api/notifications`,
        {
          user_id: post.user_id,
          notification_type: 'post_deleted',
          post_id: post._id.toString(),
          message: `Your post "${post.post_title}" has been deleted by admin.`
        },
        { timeout: 5000 }
      );
    } catch (notifyErr) {
      console.warn('Failed to send deletion notification:', notifyErr.message);
    }
    await pub.publish(
      "dashboard:stats",
      JSON.stringify({
        type: "post_deleted" // or user_deleted, post_created, etc.
      })
    );
    return res.json({
      ok: true,
      message: 'Post deleted successfully',
      post
    });
  } catch (err) {
    console.error('Error in deletePostAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * 4.3.4 - Edit post title and/or content (for corrections)
 */
export const editPostAdmin = async (req, res) => {
  try {
    const { postId } = req.params;
    const { post_title, post_description, small_description } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ ok: false, message: 'Post not found' });
    }

    // Update only provided fields
    if (post_title !== undefined && post_title.trim()) {
      post.post_title = post_title.trim();
    }
    if (post_description !== undefined && post_description.trim()) {
      post.post_description = post_description.trim();
    }
    if (small_description !== undefined) {
      post.small_description = small_description.trim();
    }

    await post.save();

    return res.json({
      ok: true,
      message: 'Post updated successfully',
      post
    });
  } catch (err) {
    console.error('Error in editPostAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * Get posts by popularity (engagement count)
 */
export const getPopularPostsAdmin = async (req, res) => {
  try {
    const limit = safeNumber(req.query.limit, 10);
    const { community, category } = req.query;

    const query = {};
    if (community) query.community = community;
    if (category) query.category = category;

    // Get posts sorted by engagement (views + comments)
    const posts = await Post.find(query)
      .sort({ views: -1 })
      .limit(limit)
      .lean();

    const enrichedPosts = posts.map((post) => {
      const engagementCount = (post.upvotes?.length || 0) + 
                             (post.downvotes?.length || 0) + 
                             (post.comments || 0) + 
                             (post.views || 0);
      return {
        _id: post._id,
        post_title: post.post_title,
        author_id: post.user_id,
        date: post.date || post.createdAt,
        status: post.status,
        category: post.category,
        community: post.community,
        engagement_count: engagementCount,
        views: post.views || 0
      };
    });

    return res.json({
      ok: true,
      data: enrichedPosts
    });
  } catch (err) {
    console.error('Error in getPopularPostsAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * Get newest posts
 */
export const getNewPostsAdmin = async (req, res) => {
  try {
    const limit = safeNumber(req.query.limit, 10);
    const { community, category } = req.query;

    const query = {};
    if (community) query.community = community;
    if (category) query.category = category;

    // Get newest posts
    const posts = await Post.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const enrichedPosts = posts.map((post) => {
      const engagementCount = (post.upvotes?.length || 0) + 
                             (post.downvotes?.length || 0) + 
                             (post.comments || 0) + 
                             (post.views || 0);
      return {
        _id: post._id,
        post_title: post.post_title,
        author_id: post.user_id,
        date: post.date || post.createdAt,
        status: post.status,
        category: post.category,
        community: post.community,
        engagement_count: engagementCount,
      };
    });

    return res.json({
      ok: true,
      data: enrichedPosts
    });
  } catch (err) {
    console.error('Error in getNewPostsAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

/**
 * Get posts by community (detailed admin view)
 */
export const getCommunityPostsAdmin = async (req, res) => {
  try {
    const { communityId } = req.params;
    const page = safeNumber(req.query.page, 1);
    const limit = safeNumber(req.query.limit, 10);
    const { status, category } = req.query;

    const query = { community: communityId };
    if (status) query.status = status;
    if (category) query.category = category;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    const enrichedPosts = posts.map((post) => {
      const engagementCount = (post.upvotes?.length || 0) + 
                             (post.downvotes?.length || 0) + 
                             (post.comments || 0) + 
                             (post.views || 0);
      return {
        _id: post._id,
        post_title: post.post_title,
        author_id: post.user_id,
        date: post.date || post.createdAt,
        status: post.status,
        category: post.category,
        engagement_count: engagementCount,
      };
    });

    return res.json({
      ok: true,
      data: enrichedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Error in getCommunityPostsAdmin:', err);
    return res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};
