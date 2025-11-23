import Streak from "../models/streakModel.js";
import {
  BADGE_DEFINITIONS,
  updateStreakLogic,
  updateBehaviorMetrics,
  calculateLevel,
  getNewlyEarnedBadges
} from "../helpers/retentionHelper.js";

// ========== STREAK CONTROLLERS ==========

export const recordActivity = async (req, res) => {
  try {
    const { user_id, activity_type, post_id, comment_id, activity_description } = req.body;

    if (!user_id || !activity_type) {
      return res.status(400).json({
        success: false,
        message: "user_id and activity_type are required"
      });
    }

    const validActivityTypes = ["read", "post", "comment", "like"];
    if (!validActivityTypes.includes(activity_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity_type. Must be one of: ${validActivityTypes.join(", ")}`
      });
    }

    await updateStreakLogic(user_id, Streak);
    const streak = await updateBehaviorMetrics(user_id, activity_type, Streak);
    const newBadges = getNewlyEarnedBadges(streak.badge_details);

    return res.status(200).json({
      ok: true,
      message: "Activity recorded successfully",
      streak: {
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        total_days_active: streak.total_days_active,
        is_active_today: streak.is_active_today,
        current_level: streak.current_level,
        total_posts: streak.total_posts,
        total_reads: streak.total_reads,
        total_comments: streak.total_comments,
        total_likes: streak.total_likes,
        badges_earned: streak.badges_earned,
        new_badges: newBadges,
        reset_count: streak.reset_count
      }
    });
  } catch (err) {
    console.error("Record activity error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

export const getUserStreak = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    let streak = await Streak.findOne({ user_id });
    if (!streak) {
      streak = await Streak.create({ user_id, current_level: 1, badges_earned: [] });
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
        total_posts: streak.total_posts,
        total_reads: streak.total_reads,
        total_comments: streak.total_comments,
        total_likes: streak.total_likes,
        badges_earned: streak.badges_earned,
        reset_count: streak.reset_count
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

    const streak = await Streak.findOne({ user_id });
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

    const streak = await Streak.findOne({ user_id });

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

    const streak = await Streak.findOne({ user_id });

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

    const streak = await Streak.findOne({ user_id });

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


