import Streak from "../models/streakModel.js";
import {
    BADGE_DEFINITIONS, normalizeUserId,
    checkAndAwardBadges,
    calculateStreakExpiry
} from "../helpers/retentionHelper.js";

// ========== STREAK CONTROLLERS ==========

export const getUserStreak = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    const normalizedUserId = normalizeUserId(user_id);
    let streak = await Streak.findOne({ user_id: normalizedUserId });
    if (!streak) {
      streak = await Streak.create({ user_id: normalizedUserId, current_level: 1, badges_earned: [] });
    }

    // ✅ Fetch UserActivity FIRST (single source of truth for metrics)
    const UserActivity = (await import('../models/activityModel.js')).default;
    const userActivity = await UserActivity.findOne({ user_id: normalizedUserId });

    // ✅ Count posts directly from Post collection (single source of truth for post count)
    let totalPostsCount = 0;
    try {
      const axios = (await import('axios')).default;
      const postsServiceUrl = process.env.POSTS_SERVICE_URL || 'http://localhost:5000';
      const postsResponse = await axios.get(`${postsServiceUrl}/api/posts`, {
        params: { user_id: normalizedUserId, limit: 1 },
        timeout: 5000
      });
      totalPostsCount = postsResponse.data?.total || 0;
    } catch (postsError) {
      console.warn('[RETENTION] Failed to fetch posts count (non-blocking):', postsError.message);
      // Fallback to activity tracking if posts service unavailable
      totalPostsCount = userActivity?.created_posts?.length || 0;
    }

    const activityMetrics = {
      total_posts: totalPostsCount,
      total_reads: userActivity?.read_posts?.length || 0,
      total_comments: userActivity?.commented_posts?.length || 0,
      total_likes: (userActivity?.upvoted_posts?.length || 0) + (userActivity?.downvoted_posts?.length || 0)
    };

    // ✅ Retroactive Badge Check: Use REAL activity metrics
    const streakWithMetrics = { ...streak.toObject(), ...activityMetrics };
    const { newBadgesEarned, newBadgeDetails } = checkAndAwardBadges(streakWithMetrics);


    let needsSave = false;

    if (newBadgesEarned.length > streak.badges_earned.length) {
      streak.badges_earned = newBadgesEarned;
      streak.badge_details = newBadgeDetails;
      needsSave = true;
    }

    // Self-heal: Fix total_days_active if inconsistent with current_streak
    if (streak.current_streak > 0 && streak.total_days_active === 0) {
      streak.total_days_active = streak.current_streak;
      needsSave = true;
    }

    // Self-heal: Ensure streak_expires_at is set for existing users
    if (!streak.streak_expires_at && streak.last_activity_date) {
      streak.streak_expires_at = calculateStreakExpiry(streak.last_activity_date);
      needsSave = true;
    }

    if (needsSave) {
      await streak.save();
    }

  

    return res.status(200).json({
      ok: true,
      streak: {
        user_id: streak.user_id,
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        total_days_active: streak.total_days_active,
        last_activity_date: streak.last_activity_date,
        streak_started_date: streak.streak_started_date,
        is_active_today: streak.is_active_today,
        current_level: streak.current_level,
        total_posts: activityMetrics.total_posts,
        total_reads: activityMetrics.total_reads,
        total_comments: activityMetrics.total_comments,
        total_likes: activityMetrics.total_likes,
        badges_earned: streak.badges_earned,
        badge_details: streak.badge_details, 
        reset_count: streak.reset_count,
        streak_expires_at: streak.streak_expires_at,
        server_time: new Date()
      }
    });
  } catch (err) {
    console.error("Get user streak error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const resetStreak = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    const normalizedUserId = normalizeUserId(user_id);
    const streak = await Streak.findOne({ user_id: normalizedUserId });
    if (!streak) {
      return res.status(404).json({ success: false, message: "Streak not found for this user" });
    }

    streak.current_streak = 0;
    streak.last_activity_date = null;
    streak.is_active_today = false;
    streak.reset_count += 1;
    await streak.save();

    return res.status(200).json({
      ok: true,
      message: "Streak reset successfully",
      streak: {
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        total_days_active: streak.total_days_active,
        reset_count: streak.reset_count,
        badges_earned: streak.badges_earned
      }
    });
  } catch (err) {
    console.error("Reset streak error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// ========== BADGE CONTROLLERS ==========

export const getAllBadges = async (req, res) => {
  try {
    return res.status(200).json({
      ok: true,
      total_available: BADGE_DEFINITIONS.length,
      badges: BADGE_DEFINITIONS.map((badge) => ({
        badge_id: badge.badge_id,
        badge_name: badge.badge_name,
        badge_icon: badge.badge_icon,
        level: badge.level,
        requirement_type: badge.requirement_type,
        requirement_value: badge.requirement_value,
        description: badge.description
      }))
    });
  } catch (err) {
    console.error("Get all badges error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const getUserBadges = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    const normalizedUserId = normalizeUserId(user_id);
    const streak = await Streak.findOne({ user_id: normalizedUserId });

    if (!streak || streak.badges_earned.length === 0) {
      return res.status(200).json({
        ok: true,
        badges_earned: [],
        message: "No badges earned yet"
      });
    }

    return res.status(200).json({
      ok: true,
      total_earned: streak.badges_earned.length,
      badges_earned: streak.badge_details.map((badge) => ({
        badge_id: badge.badge_id,
        badge_name: badge.badge_name,
        badge_icon: badge.badge_icon,
        level: badge.level,
        description: badge.description,
        earned_at: badge.earned_at
      }))
    });
  } catch (err) {
    console.error("Get user badges error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// ========== LEVEL CONTROLLERS ==========

export const getUserLevel = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    const normalizedUserId = normalizeUserId(user_id);
    const streak = await Streak.findOne({ user_id: normalizedUserId });

    if (!streak) {
      return res.status(200).json({
        ok: true,
        level_info: {
          current_level: 1,
          total_posts: 0,
          total_reads: 0,
          total_comments: 0,
          total_likes: 0,
          activity_score: 0
        }
      });
    }

    const activityScore = streak.total_posts * 3 + streak.total_reads * 1 + streak.total_comments * 2;

    return res.status(200).json({
      ok: true,
      level_info: {
        current_level: streak.current_level,
        total_posts: streak.total_posts,
        total_reads: streak.total_reads,
        total_comments: streak.total_comments,
        total_likes: streak.total_likes,
        activity_score: activityScore,
        level_thresholds: {
          level_1: 0,
          level_2: 10,
          level_3: 30,
          level_4: 60,
          level_5: 100
        }
      }
    });
  } catch (err) {
    console.error("Get user level error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

// ========== STATS & LEADERBOARD ==========

export const getUserStats = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    const normalizedUserId = normalizeUserId(user_id);
    const streak = await Streak.findOne({ user_id: normalizedUserId });

    if (!streak) {
      return res.status(200).json({
        ok: true,
        stats: {
          current_streak: 0,
          longest_streak: 0,
          total_days_active: 0,
          current_level: 1,
          total_posts: 0,
          total_reads: 0,
          total_comments: 0,
          total_likes: 0,
          reset_count: 0,
          total_badges: 0,
          is_active_today: false
        }
      });
    }

    return res.status(200).json({
      ok: true,
      stats: {
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        total_days_active: streak.total_days_active,
        current_level: streak.current_level,
        total_posts: streak.total_posts,
        total_reads: streak.total_reads,
        total_comments: streak.total_comments,
        total_likes: streak.total_likes,
        reset_count: streak.reset_count,
        total_badges: streak.badges_earned.length,
        is_active_today: streak.is_active_today,
        last_activity_date: streak.last_activity_date,
        streak_started_date: streak.streak_started_date
      }
    });
  } catch (err) {
    console.error("Get user stats error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 100);
    const sortBy = req.query.sortBy || "level";

    const sortQueries = {
      streak: { current_streak: -1, longest_streak: -1 },
      posts: { total_posts: -1, current_level: -1 },
      reads: { total_reads: -1, current_level: -1 },
      level: { current_level: -1, total_posts: -1, total_reads: -1 }
    };

    const leaderboard = await Streak.find()
      .sort(sortQueries[sortBy] || sortQueries.level)
      .limit(limit)
      .select("user_id current_streak longest_streak total_days_active current_level total_posts total_reads total_comments badges_earned");

    return res.status(200).json({
      ok: true,
      sort_by: sortBy,
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        user_id: entry.user_id,
        current_level: entry.current_level,
        current_streak: entry.current_streak,
        longest_streak: entry.longest_streak,
        total_days_active: entry.total_days_active,
        total_posts: entry.total_posts,
        total_reads: entry.total_reads,
        total_comments: entry.total_comments,
        total_badges: entry.badges_earned.length
      }))
    });
  } catch (err) {
    console.error("Get leaderboard error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }

};
