import Post from "../models/Post.js";
import { queues } from "../config/redis.js";
import { createRedisClients } from "../../shared-config/redisClient.js";
import axios from "axios";

const { pub } = await createRedisClients();
const HOST = process.env.HOST || "http://localhost";

async function notifyCommunityFollowersForNewPost(post) {
  try {
    if (!post?.community) return;

    const communityServiceUrl =
      process.env.COMMUNITY_SERVICE_URL ||
      `${HOST}:${process.env.COMMUNITY_SERVICE_PORT || process.env.COMMUNITY_PORT || 5001}`;
    const rawCommunityRef = String(post.community || "").trim();
    const isMongoId = /^[a-fA-F0-9]{24}$/.test(rawCommunityRef);

    let communityId = isMongoId ? rawCommunityRef : null;

    // Frontend currently sends community name in create payload.
    // Resolve name -> _id so we can fetch full community details with members.
    if (!communityId) {
      try {
        const listRes = await axios.get(
          `${communityServiceUrl}/api/communities/all`,
          { timeout: 5000 }
        );

        const communities = Array.isArray(listRes.data?.communities) ? listRes.data.communities : [];
        const matched = communities.find(
          (c) => String(c?.community_name || "").toLowerCase() === rawCommunityRef.toLowerCase()
        );

        communityId = matched?._id?.toString() || null;
      } catch (resolveErr) {
        console.warn("[POST] Failed to resolve community by name for notifications:", resolveErr.message);
      }
    }

    if (!communityId) {
      console.warn(`[POST] Skipping newPost notifications: unable to resolve community '${rawCommunityRef}'`);
      return;
    }

    let communityRes;
    try {
      communityRes = await axios.get(
        `${communityServiceUrl}/api/communities/${communityId}`,
        {
          params: { user_id: post.user_id },
          timeout: 5000
        }
      );
    } catch (primaryErr) {
      // Backward-compatible fallback if service is mounted differently in some environments.
      communityRes = await axios.get(
        `${communityServiceUrl}/communities/${communityId}`,
        {
          params: { user_id: post.user_id },
          timeout: 5000
        }
      );
    }

    const community = communityRes.data?.community;
    const members = Array.isArray(community?.members) ? community.members : [];
    if (!members.length) {
      console.log(`[POST] No members found for community ${communityId}; skipping newPost notifications`);
      return;
    }

    const authorId = post.user_id?.toString();
    const followerIds = members
      .map((memberId) => memberId?.toString())
      .filter((memberId) => memberId && memberId !== authorId);

    if (!followerIds.length) return;

    console.log(`[POST] Notifying ${followerIds.length} followers about new post ${post._id}`);

    const authorName = post.author_username || "A creator you follow";
    const communityName = community?.community_name || "the community";
    const message = `${authorName} published a new post in ${communityName}.`;

    await Promise.all(
      followerIds.map((receiverId) => {
        const notificationPayload = {
          receiverId,
          senderId: authorId,
          triggerType: "newPost",
          triggerId: `new-post-${post._id}-${receiverId}-${Date.now()}`,
          entityType: "post",
          entityId: post._id.toString(),
          postId: post._id.toString(),
          communityName,
          message,
        };

        return pub.publish("notification:event", JSON.stringify({ notificationPayload }));
      })
    );
  } catch (err) {
    console.warn("[POST] Failed to notify followers for new post (non-blocking):", err.message);
  }
}

// CREATE — fast, enqueue heavy work
export const createPost = async (req, res) => {
  try {
    const {
      post_title,
      small_description,
      post_description,
      category,
      tags = [],
      community,
      user_id,
      author_username,
      thumbnail,
      mediaInputs = [] // array of base64 strings or URLs
    } = req.body;

    const post = await Post.create({
      post_title,
      small_description,
      post_description,
      category,
      tags,
      community,
      user_id,
      author_username: author_username || "Anonymous",
      thumbnail: thumbnail || null,
      media: { inputs: Array.isArray(mediaInputs) ? mediaInputs : [] },
      status: "pending_review"
    });

    await queues.qaJobs.add(
      "validatePost",
      { postId: post._id.toString() },
      { attempts: 3, removeOnComplete: true, removeOnFail: 50 }
    );

    // enqueue worker job
    await queues.postJobs.add(
      "processPost",
      { postId: post._id.toString() },
      { attempts: 3, removeOnComplete: true, removeOnFail: 50 }
    );

    // Log post creation activity for badge tracking (non-blocking)
    try {
      const retentionUrl =
        process.env.RETENTION_SERVICE_URL ||
        `${HOST}:${process.env.RETENTION_SERVICE_PORT || process.env.RETENTION_PORT || 5005}`;
      await axios.post(
        `${retentionUrl}/api/activity/log`,
        {
          user_id,
          activity_type: 'post',
          post_id: post._id.toString()
        },
        {
          headers: { Authorization: req.headers.authorization },
          timeout: 5000
        }
      );
      console.log('[POST] Post activity logged for badge tracking');
    } catch (activityError) {
      console.warn('[POST] Failed to log post activity (non-blocking):', activityError.message);
    }

    // Notify community followers about the new post (non-blocking)
    await notifyCommunityFollowersForNewPost(post);

    await pub.publish(
      "dashboard:stats",
      JSON.stringify({
        type: "post_created" // or user_deleted, post_created, etc.
      })
    );

    return res.status(201).json({
      ok: true,
      message: "Post created. Processing in background.",
      post
    });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
};

// GET ALL — infinite scroll (skip+limit) + optional filters
export const getPosts = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 100);

    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.user_id) query.user_id = String(req.query.user_id).trim();
    if (req.query.community) query.community = req.query.community;
    if (req.query.status) query.status = req.query.status;

    // tags can be "ai,web"
    if (req.query.tags) {
      const tagList = req.query.tags.split(",").map(s => s.trim()).filter(Boolean);
      if (tagList.length) query.tags = { $in: tagList };
    }

    const posts = await Post.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.json({ ok: true, total, count: posts.length, posts });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET BY ID
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ ok: false, error: "Not found" });

    res.json({ ok: true, post });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// UPDATE — enqueue if description/media changed
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    const update = { ...req.body };
    if (Array.isArray(req.body.mediaInputs)) {
      update["media.inputs"] = req.body.mediaInputs;
      update.status = "pending_review";
    }

    const before = await Post.findById(id).select("post_description");
    const post = await Post.findByIdAndUpdate(id, update, { new: true });

    if (!post) return res.status(404).json({ ok: false, error: "Not found" });

    const descChanged =
      before &&
      typeof req.body.post_description === "string" &&
      req.body.post_description !== before.post_description;

    const hasNewMedia = Array.isArray(req.body.mediaInputs) && req.body.mediaInputs.length > 0;

    await queues.qaJobs.add(
      "validatePost",
      { postId: post._id.toString() },
      { attempts: 3, removeOnComplete: true, removeOnFail: 50 }
    );
    if (descChanged || hasNewMedia) {
      await queues.postJobs.add(
        "processPost",
        { postId: post._id.toString() },
        { attempts: 3, removeOnComplete: true, removeOnFail: 50 }
      );
    }

    res.json({ ok: true, post });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

// DELETE
export const deletePost = async (req, res) => {
  try {
    const deleted = await Post.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Not found" });
    // Optionally: enqueue a job to delete Cloudinary assets (not implemented here)
    await pub.publish(
      "dashboard:stats",
      JSON.stringify({
        type: "post_deleted" // or user_deleted, post_created, etc.
      })
    );
    res.json({ ok: true, message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// SEARCH — simple text-based search with tags and categories
export const searchPosts = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const tagsParam = String(req.query.tags || "").trim();
    const categoryParam = String(req.query.category || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
    const skip = (page - 1) * limit;

    // If no search query, return empty results
    if (!q && !tagsParam && !categoryParam) {
      return res.json({
        ok: true,
        count: 0,
        total: 0,
        page,
        totalPages: 0,
        posts: []
      });
    }

    let query = {};
    const conditions = [];

    // 🔍 Text search - allow even single character searches
    if (q && q.length >= 1) {
      const terms = q.split(/[\s,]+/)
        .map(t => t.trim())
        .filter(t => t.length >= 1)
        .slice(0, 10); // Limit to 10 terms max

      if (terms.length > 0) {
        // Create text search conditions for each term
        const textConditions = terms.map(term => {
          const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
          return {
            $or: [
              { post_title: regex },
              { small_description: regex },
              { post_description: regex },
              { tags: regex }
            ]
          };
        });

        // ALL terms must match (more restrictive)
        conditions.push({ $and: textConditions });
      }
    }

    // 🏷️ Tag filter
    if (tagsParam) {
      const requestedTags = tagsParam
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      if (requestedTags.length > 0) {
        conditions.push({
          tags: {
            $in: requestedTags.map(tag => new RegExp(`^${tag}$`, "i"))
          }
        });
      }
    }

    // 📂 Category filter
    if (categoryParam) {
      conditions.push({
        category: new RegExp(`^${categoryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
      });
    }

    // Only proceed if we have actual search conditions
    if (conditions.length === 0) {
      return res.json({
        ok: true,
        count: 0,
        total: 0,
        page,
        totalPages: 0,
        posts: []
      });
    }

    query = conditions.length === 1 ? conditions[0] : { $and: conditions };

    console.log("Search query:", JSON.stringify(query, null, 2));

    // Simple aggregation for relevance scoring
    const posts = await Post.aggregate([
      { $match: query },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Title matches get highest score
              q ? {
                $cond: [
                  { $regexMatch: { input: "$post_title", regex: q, options: "i" } },
                  100,
                  0
                ]
              } : 0,
              // Small description matches get medium score
              q ? {
                $cond: [
                  { $regexMatch: { input: { $ifNull: ["$small_description", ""] }, regex: q, options: "i" } },
                  50,
                  0
                ]
              } : 0,
              // Tag exact matches get good score
              q ? {
                $multiply: [
                  {
                    $size: {
                      $filter: {
                        input: { $ifNull: ["$tags", []] },
                        cond: { $regexMatch: { input: "$$this", regex: q, options: "i" } }
                      }
                    }
                  },
                  30
                ]
              } : 0,
              // Content matches get lower score
              q ? {
                $cond: [
                  { $regexMatch: { input: "$post_description", regex: q, options: "i" } },
                  20,
                  0
                ]
              } : 0
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const total = await Post.countDocuments(query);

    res.json({
      ok: true,
      count: posts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      searchQuery: q,
      posts
    });

  } catch (err) {
    console.error("Search posts error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// STATUS — to poll pending/ready
export const getPostStatus = async (req, res) => {
  try {
    const doc = await Post.findById(req.params.id).select("status");
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, status: doc.status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// LIKE POST
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ ok: false, error: "User ID required" });
    }

    // Normalize user_id to string for consistency
    const normalizedUserId = String(user_id);

    // Check current state to determine toggle action
    const post = await Post.findById(id).select('upvotes downvotes user_id post_title');
    if (!post) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    const alreadyLiked = post.upvotes.includes(normalizedUserId);
    const alreadyDisliked = post.downvotes.includes(normalizedUserId);

    const postOwnerId = post.user_id?.toString();
    const likeTriggerId = `like-post-${id}-${normalizedUserId}`;

    // Use atomic operations to prevent race conditions
    let update;
    if (alreadyLiked) {
      // Remove like atomically
      update = {
        $pull: { upvotes: normalizedUserId }
      };
    } else {
      // Add like atomically (using $addToSet prevents duplicates even with concurrent requests)
      // Also remove from dislikes if present
      update = {
        $addToSet: { upvotes: normalizedUserId },
        $pull: { downvotes: normalizedUserId }
      };
    }

    // Apply atomic update and get updated document
    const updatedPost = await Post.findByIdAndUpdate(id, update, { new: true }).select('upvotes downvotes');

    // Keep notifications consistent with like toggle behavior.
    if (postOwnerId && postOwnerId !== normalizedUserId) {
      if (!alreadyLiked) {
        const notificationPayload = {
          receiverId: postOwnerId,
          senderId: normalizedUserId,
          triggerType: "likePost",
          triggerId: likeTriggerId,
          entityType: "post",
          entityId: id,
          postId: id,
          message: "liked your post",
        };

        await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
      } else {
        const payload = {
          receiverId: postOwnerId,
          entityId: id,
          triggerType: "likePost",
          commentId: likeTriggerId,
          entityType: "post"
        };

        await pub.publish("notification:delete", JSON.stringify({ payload }));
      }
    }

    res.json({
      ok: true,
      message: alreadyLiked ? "Like removed" : "Post liked",
      upvotes: updatedPost.upvotes.length,
      downvotes: updatedPost.downvotes.length,
      userLiked: !alreadyLiked,
      userDisliked: false
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// DISLIKE POST
export const dislikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ ok: false, error: "User ID required" });
    }

    // Normalize user_id to string for consistency
    const normalizedUserId = String(user_id);

    // Check current state to determine toggle action
    const post = await Post.findById(id).select('upvotes downvotes');
    if (!post) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    const alreadyDisliked = post.downvotes.includes(normalizedUserId);
    const alreadyLiked = post.upvotes.includes(normalizedUserId);

    // Use atomic operations to prevent race conditions
    let update;
    if (alreadyDisliked) {
      // Remove dislike atomically
      update = {
        $pull: { downvotes: normalizedUserId }
      };
    } else {
      // Add dislike atomically (using $addToSet prevents duplicates even with concurrent requests)
      // Also remove from likes if present
      update = {
        $addToSet: { downvotes: normalizedUserId },
        $pull: { upvotes: normalizedUserId }
      };
    }

    // Apply atomic update and get updated document
    const updatedPost = await Post.findByIdAndUpdate(id, update, { new: true }).select('upvotes downvotes');

    res.json({
      ok: true,
      message: alreadyDisliked ? "Dislike removed" : "Post disliked",
      upvotes: updatedPost.upvotes.length,
      downvotes: updatedPost.downvotes.length,
      userLiked: false,
      userDisliked: !alreadyDisliked
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};


// GET POST VOTE STATUS
export const getPostVoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const post = await Post.findById(id).select('upvotes downvotes');
    if (!post) {
      return res.status(404).json({ ok: false, error: "Post not found" });
    }

    // Normalize user_id to string for consistent comparison
    const normalizedUserId = user_id ? String(user_id) : null;
    const userLiked = normalizedUserId ? post.upvotes.includes(normalizedUserId) : false;
    const userDisliked = normalizedUserId ? post.downvotes.includes(normalizedUserId) : false;

    res.json({
      ok: true,
      upvotes: post.upvotes.length,
      downvotes: post.downvotes.length,
      userLiked,
      userDisliked
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
// INCREMENT VIEWS - Session-based tracking (one view per user per day)
export const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body; // Optional - for logged-in users

    // Import ViewTracking model
    const ViewTracking = (await import('../models/ViewTracking.js')).default;

    // Check if this is a logged-in user
    if (user_id) {
      // Check if user has already viewed this post today
      const hasViewed = await ViewTracking.hasViewedToday(user_id, id);

      if (hasViewed) {
        // User already viewed today - don't increment
        const post = await Post.findById(id).select('views');
        if (!post) return res.status(404).json({ ok: false, error: "Not found" });

        return res.json({
          ok: true,
          views: post.views,
          message: "View already counted for this session"
        });
      }

      // Record this view in tracking
      await ViewTracking.recordView(user_id, id);
    }

    // Increment view count (for new sessions or anonymous users)
    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).select('views');

    if (!post) return res.status(404).json({ ok: false, error: "Not found" });

    res.json({
      ok: true,
      views: post.views,
      message: user_id ? "View counted" : "Anonymous view counted"
    });
  } catch (err) {
    console.error('Increment view error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// == LITE: minimal post data for RE-service (tags, community, createdAt)
export const getPostLite = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Post.findById(id).select("tags community createdAt date");
    if (!doc) return res.status(404).json({ ok: false, error: "Post not found" });
    return res.json({
      ok: true,
      post: {
        _id: doc._id,
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        community: doc.community || null,
        createdAt: doc.createdAt || doc.date || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// == CANDIDATES: filter by tags and/or community, minimal fields for ranking
export const getPostCandidates = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);
    const skip = parseInt(req.query.skip || "0", 10);
    const tagsParam = String(req.query.tags || "").trim();
    const community = String(req.query.community || "").trim();

    const or = [];
    if (tagsParam) {
      const tags = tagsParam.split(",").map(s => s.trim()).filter(Boolean);
      if (tags.length) or.push({ tags: { $in: tags } });
    }
    if (community) or.push({ community });

    const query = or.length ? { $or: or } : {};

    const posts = await Post.find(query)
      .select("post_title tags community createdAt date")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({ ok: true, count: posts.length, posts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
