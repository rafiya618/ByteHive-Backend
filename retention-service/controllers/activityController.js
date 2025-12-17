import UserActivity from "../models/activityModel.js";

/**
 * Log user activity (with automatic deduplication)
 * Uses the new UserActivity model which ensures unique blog references per activity type
 */
export const logActivity = async (req, res) => {
  try {
    const { user_id, activity_type, post_id, comment_id } = req.body;

    console.log('📝 [ACTIVITY] Logging activity request:', { user_id, activity_type, post_id, comment_id });

    // Validate required fields (blogId optional for word_meaning and search)
    if (!user_id || !activity_type) {
      console.warn('⚠️ [ACTIVITY] Missing required fields:', { user_id, activity_type });
      return res.status(400).json({
        error: 'user_id and activity_type are required'
      });
    }

    const validActivityTypes = ["read", "like", "upvote", "downvote", "comment", "simplify", "word_meaning", "search"];
    if (!validActivityTypes.includes(activity_type)) {
      console.warn('⚠️ [ACTIVITY] Invalid activity type:', activity_type);
      return res.status(400).json({
        ok: false,
        message: `Invalid activity_type. Must be one of: ${validActivityTypes.join(", ")}`
      });
    }

    // Determine blog ID
    const blogId = post_id || comment_id;
    console.log('🔍 [ACTIVITY] Blog ID determination:', { post_id, comment_id, blogId, blogIdType: typeof blogId });

    if (!blogId) {
      // Exceptions for activities that don't require a post
      const activitiesWithoutPost = ['word_meaning', 'search'];
      if (!activitiesWithoutPost.includes(activity_type)) {
        console.warn('⚠️ [ACTIVITY] Missing blog ID');
        console.warn('⚠️ [ACTIVITY] Request body was:', req.body);
        return res.status(400).json({
          ok: false,
          message: "post_id or comment_id is required"
        });
      }
    }

    // Normalize user_id to string for consistency
    const normalizedUserId = String(user_id);
    console.log('🔄 [ACTIVITY] Normalized user_id:', normalizedUserId);

    // Find or create user activity document
    let userActivity = await UserActivity.findOne({ user_id: normalizedUserId });

    if (!userActivity) {
      console.log('➕ [ACTIVITY] Creating new UserActivity document for user:', normalizedUserId);
      userActivity = new UserActivity({ user_id: normalizedUserId });
    } else {
      console.log('✅ [ACTIVITY] Found existing UserActivity document');
    }

    // Add activity (automatic deduplication handled by model method)
    const activityFieldMap = {
      'read': 'read_posts',
      'like': 'liked_posts',
      'upvote': 'upvoted_posts',
      'comment': 'commented_posts',
      'simplify': 'simplified_posts'
    };
    const fieldName = activityFieldMap[activity_type];
    const existingEntry = fieldName ? userActivity[fieldName]?.find(e => e.blog_id === blogId) : null;

    if (existingEntry) {
      console.log(`🔁 [ACTIVITY] Updating existing ${activity_type} for blog ${blogId}, count: ${existingEntry.count} → ${existingEntry.count + 1}`);
    } else {
      console.log(`✨ [ACTIVITY] Adding new ${activity_type} for blog ${blogId}`);
    }

    userActivity.addActivity(activity_type, blogId);
    await userActivity.save();

    console.log('💾 [ACTIVITY] Activity saved successfully');

    // Update streak and behavior metrics
    try {
      const { updateBehaviorMetrics, updateStreakLogic } = await import('../helpers/retentionHelper.js');
      const Streak = (await import('../models/streakModel.js')).default;
      console.log('🔄 [ACTIVITY] Updating behavior metrics...');
      await updateStreakLogic(normalizedUserId, Streak);
      const updatedStreak = await updateBehaviorMetrics(normalizedUserId, activity_type, Streak);
      console.log('✅ [ACTIVITY] Metrics updated. Level:', updatedStreak.current_level, 'Badges:', updatedStreak.badges_earned.length);
    } catch (metricsError) {
      console.error('⚠️ [ACTIVITY] Metrics update failed (non-blocking):', metricsError.message);
    }

    return res.status(201).json({
      ok: true,
      message: "Activity logged successfully",
      activity: {
        user_id: userActivity.user_id,
        activity_type,
        blog_id: blogId,
        unique_blogs_count: userActivity[`${activity_type === 'like' ? 'liked' : activity_type === 'upvote' ? 'upvoted' : activity_type === 'comment' ? 'commented' : activity_type}_posts`]?.length || 0
      }
    });
  } catch (err) {
    console.error("❌ [ACTIVITY] Error logging activity:", err.message);
    console.error("❌ [ACTIVITY] Error name:", err.name);
    console.error("❌ [ACTIVITY] Full error:", err);
    console.error("❌ [ACTIVITY] Stack trace:");
    console.error(err.stack);
    return res.status(500).json({
      ok: false,
      error: err.message,
      errorName: err.name,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Remove user activity (for vote/interaction removals)
 * Completely removes the blog entry from the activity array
 */
export const removeActivity = async (req, res) => {
  try {
    const { user_id, activity_type, post_id } = req.body;

    console.log('🗑️ [ACTIVITY-REMOVE] Request:', { user_id, activity_type, post_id });

    // Validate required fields
    if (!user_id || !activity_type || !post_id) {
      console.warn('⚠️ [ACTIVITY-REMOVE] Missing required fields');
      return res.status(400).json({
        ok: false,
        error: 'user_id, activity_type, and post_id are required'
      });
    }

    const validActivityTypes = ["upvote", "downvote", "like", "comment"];
    if (!validActivityTypes.includes(activity_type)) {
      console.warn('⚠️ [ACTIVITY-REMOVE] Invalid activity type:', activity_type);
      return res.status(400).json({
        ok: false,
        error: `Invalid activity_type for removal. Must be one of: ${validActivityTypes.join(", ")}`
      });
    }

    // Normalize user_id
    const normalizedUserId = String(user_id);
    console.log('🔄 [ACTIVITY-REMOVE] Normalized user_id:', normalizedUserId);

    // Find user activity document
    let userActivity = await UserActivity.findOne({ user_id: normalizedUserId });

    if (!userActivity) {
      console.log('ℹ️ [ACTIVITY-REMOVE] No activity document found for user');
      return res.status(404).json({
        ok: false,
        error: 'No activity found for this user'
      });
    }

    // Remove the activity
    const removed = userActivity.removeActivity(activity_type, post_id);

    if (removed) {
      await userActivity.save();
      console.log('✅ [ACTIVITY-REMOVE] Activity removed and saved');

      return res.status(200).json({
        ok: true,
        message: "Activity removed successfully",
        activity: {
          user_id: userActivity.user_id,
          activity_type,
          blog_id: post_id,
          removed: true
        }
      });
    } else {
      console.log('ℹ️ [ACTIVITY-REMOVE] No matching activity found to remove');
      return res.status(200).json({
        ok: true,
        message: "No activity found to remove",
        activity: {
          user_id: userActivity.user_id,
          activity_type,
          blog_id: post_id,
          removed: false
        }
      });
    }
  } catch (err) {
    console.error("❌ [ACTIVITY-REMOVE] Error:", err.message);
    console.error("❌ [ACTIVITY-REMOVE] Stack trace:", err.stack);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get user's activity history
 */
export const getUserActivityHistory = async (req, res) => {
  try {
    const { user_id } = req.params;
    const activityType = req.query.activity_type; // Optional filter

    if (!user_id) {
      return res.status(400).json({
        ok: false,
        message: "user_id is required"
      });
    }

    // Normalize user_id to string for consistent querying
    const normalizedUserId = String(user_id);

    const userActivity = await UserActivity.findOne({ user_id: normalizedUserId });

    if (!userActivity) {
      return res.status(200).json({
        ok: true,
        total: 0,
        activities: {
          read_posts: [],
          liked_posts: [],
          upvoted_posts: [],
          commented_posts: [],
          simplified_posts: [],
          word_lookup_posts: [],
          searched_posts: []
        }
      });
    }

    // If specific activity type requested, filter
    if (activityType) {
      const activityMap = {
        'read': 'read_posts',
        'like': 'liked_posts',
        'upvote': 'upvoted_posts',
        'comment': 'commented_posts',
        'simplify': 'simplified_posts',
        'word_meaning': 'word_lookup_posts',
        'search': 'searched_posts'
      };

      const fieldName = activityMap[activityType];
      if (!fieldName) {
        return res.status(400).json({
          ok: false,
          message: `Invalid activity_type: ${activityType}`
        });
      }

      return res.status(200).json({
        ok: true,
        activity_type: activityType,
        total: userActivity[fieldName].length,
        activities: userActivity[fieldName]
      });
    }

    // Return all activities
    return res.status(200).json({
      ok: true,
      total: userActivity.total_reads + userActivity.total_likes + userActivity.total_upvotes + userActivity.total_comments,
      activities: {
        read_posts: userActivity.read_posts,
        liked_posts: userActivity.liked_posts,
        upvoted_posts: userActivity.upvoted_posts,
        commented_posts: userActivity.commented_posts,
        simplified_posts: userActivity.simplified_posts,
        word_lookup_posts: userActivity.word_lookup_posts,
        searched_posts: userActivity.searched_posts
      },
      metrics: {
        total_reads: userActivity.total_reads,
        total_likes: userActivity.total_likes,
        total_upvotes: userActivity.total_upvotes,
        total_comments: userActivity.total_comments
      }
    });
  } catch (err) {
    console.error("Get user activity history error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get activity by type
 */
export const getActivityByType = async (req, res) => {
  try {
    const { user_id, activity_type } = req.params;
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

    if (!user_id || !activity_type) {
      return res.status(400).json({
        ok: false,
        message: "user_id and activity_type are required"
      });
    }

    const validActivityTypes = ["read", "post", "comment", "like", "view", "downvote", "comment_view"];
    if (!validActivityTypes.includes(activity_type)) {
      return res.status(400).json({
        ok: false,
        message: `Invalid activity_type. Must be one of: ${validActivityTypes.join(", ")}`
      });
    }

    const activities = await Activity.find({ user_id, activity_type })
      .sort({ activity_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments({ user_id, activity_type });

    return res.status(200).json({
      ok: true,
      total,
      count: activities.length,
      activities
    });
  } catch (err) {
    console.error("Get activity by type error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get activity summary for user (activity count by type)
 */
export const getActivitySummary = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        ok: false,
        message: "user_id is required"
      });
    }

    const summary = await Activity.aggregate([
      { $match: { user_id: Number(user_id) } },
      {
        $group: {
          _id: "$activity_type",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const total = await Activity.countDocuments({ user_id });

    return res.status(200).json({
      ok: true,
      total,
      summary: summary.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error("Get activity summary error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get daily activity count
 */
export const getDailyActivityCount = async (req, res) => {
  try {
    const { user_id } = req.params;
    const days = parseInt(req.query.days || "30", 10);

    if (!user_id) {
      return res.status(400).json({
        ok: false,
        message: "user_id is required"
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyActivity = await Activity.aggregate([
      {
        $match: {
          user_id: Number(user_id),
          activity_date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$activity_date" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      ok: true,
      period_days: days,
      daily_activity: dailyActivity
    });
  } catch (err) {
    console.error("Get daily activity count error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Delete activity (admin only)
 */
export const deleteActivity = async (req, res) => {
  try {
    const { activity_id } = req.params;

    if (!activity_id) {
      return res.status(400).json({
        ok: false,
        message: "activity_id is required"
      });
    }

    const deletedActivity = await Activity.findByIdAndDelete(activity_id);

    if (!deletedActivity) {
      return res.status(404).json({
        ok: false,
        message: "Activity not found"
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Activity deleted successfully"
    });
  } catch (err) {
    console.error("Delete activity error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};
