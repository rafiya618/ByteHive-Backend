/**
 * Retention Service Helper Functions
 * Handles streak logic, level calculation, and badge management
 */

// ========== BADGE DEFINITIONS (MAX 5 - LEVELS 1-5) ==========
/**
 * EXACTLY 5 BADGES for Levels 1-5
 * Each badge represents a milestone of achievement
 */
export const BADGE_DEFINITIONS = [
  {
    badge_id: "novice-explorer",
    badge_name: "Novice Explorer",
    badge_icon: "menu_book",
    level: 1,
    requirement_type: "reads",
    requirement_value: 5,
    description: "Read 5 posts - Your journey begins!"
  },
  {
    badge_id: "active-contributor",
    badge_name: "Active Contributor",
    badge_icon: "create",
    level: 2,
    requirement_type: "posts",
    requirement_value: 3,
    description: "Created 3 posts - Sharing knowledge"
  },
  {
    badge_id: "engaged-member",
    badge_name: "Engaged Member",
    badge_icon: "chat",
    level: 3,
    requirement_type: "comments",
    requirement_value: 15,
    description: "Posted 15 comments - Active in discussions"
  },
  {
    badge_id: "community-champion",
    badge_name: "Community Champion",
    badge_icon: "flash",
    level: 4,
    requirement_type: "likes",
    requirement_value: 20,
    description: "Given 20 likes - Supporting the community"
  },
  {
    badge_id: "master-scholar",
    badge_name: "Master Scholar",
    badge_icon: "school",
    level: 5,
    requirement_type: "reads",
    requirement_value: 50,
    description: "Read 50 posts - True dedication to learning"
  }
];

// ========== USER ID NORMALIZATION ==========
/**
 * Normalize user_id to consistent string format
 * Handles ObjectId, string, or other formats to prevent type mismatch in MongoDB queries
 */
export const normalizeUserId = (userId) => {
  if (!userId) return null;
  // Handle ObjectId objects with toString method
  if (typeof userId === 'object' && userId.toString) {
    return userId.toString();
  }
  return String(userId);
};

// ========== DATE HELPERS ==========

/**
 * Calculate streak expiry time (End of the current day in UTC)
 * @param {Date} date - The activity date
 * @returns {Date} - Expiry date
 */
export const calculateStreakExpiry = (date) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  // Add 24 hours to cover the *next* day as the valid window?
  // Usually streak is "do something *tomorrow*".
  // If I do something today (Day 1), I have until End of Day 2 to keep it.
  d.setDate(d.getDate() + 1);
  return d;
};

/**
 * Check if user has activity today
 */
export const hasActivityToday = (lastActivityDate) => {
  if (!lastActivityDate) return false;
  const today = new Date();
  const lastActivity = new Date(lastActivityDate);
  return (
    today.getFullYear() === lastActivity.getFullYear() &&
    today.getMonth() === lastActivity.getMonth() &&
    today.getDate() === lastActivity.getDate()
  );
};

/**
 * Check if user had activity yesterday
 */
export const hadActivityYesterday = (lastActivityDate) => {
  if (!lastActivityDate) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const lastActivity = new Date(lastActivityDate);
  return (
    yesterday.getFullYear() === lastActivity.getFullYear() &&
    yesterday.getMonth() === lastActivity.getMonth() &&
    yesterday.getDate() === lastActivity.getDate()
  );
};

// ========== LEVEL SYSTEM ==========
/**
 * Calculate user level based on badges earned (1-5)
 * Single source of truth: Badge count determines level
 * 
 * @param {Array} badgesEarned - Array of badge IDs the user has earned
 * @returns {Number} - User level (1-5)
 * 
 * Level Mapping:
 * - 0 badges → Level 1 (starter)
 * - 1 badge  → Level 2
 * - 2 badges → Level 3
 * - 3 badges → Level 4
 * - 4 badges → Level 5
 * - 5 badges → Level 5 (max)
 */
export const calculateLevelFromBadges = (badgesEarned) => {
  const badgeCount = badgesEarned?.length || 0;
  return Math.min(badgeCount + 1, 5); // 0 badges = level 1, 5 badges = level 5
};

// ========== BADGE SYSTEM ==========
/**
 * Check and award new badges based on user behavior (max 5 badges)
 * UPDATED: Maximum 5 badges per user (Levels 1-5)
 */
export const checkAndAwardBadges = (streak) => {
  const { total_posts, total_reads, total_comments, total_likes, badges_earned, badge_details } = streak;
  const newBadgesEarned = [...badges_earned];
  const newBadgeDetails = [...badge_details];

  // Check each badge definition against user metrics
  const badgesToCheck = BADGE_DEFINITIONS.filter(
    (badge) => !newBadgesEarned.includes(badge.badge_id)
  );

  badgesToCheck.forEach((badge) => {
    let earnedThisBadge = false;

    switch (badge.requirement_type) {
      case "reads":
        earnedThisBadge = total_reads >= badge.requirement_value;
        break;
      case "posts":
        earnedThisBadge = total_posts >= badge.requirement_value;
        break;
      case "comments":
        earnedThisBadge = total_comments >= badge.requirement_value;
        break;
      case "likes":
        earnedThisBadge = total_likes >= badge.requirement_value;
        break;
      case "streak":
        earnedThisBadge = streak.current_streak >= badge.requirement_value;
        break;
      default:
        break;
    }

    // Award badge if max 5 not reached and criteria met
    if (earnedThisBadge && newBadgesEarned.length < 5) {
      newBadgesEarned.push(badge.badge_id);
      newBadgeDetails.push({
        ...badge,
        earned_at: new Date()
      });
    }
  });

  return { newBadgesEarned, newBadgeDetails };
};

/**
 * Identify newly earned badges for response
 */
export const getNewlyEarnedBadges = (badgeDetails) => {
  return badgeDetails
    .filter((b) => b.earned_at && new Date(b.earned_at).getTime() > Date.now() - 5000)
    .map((b) => ({
      badge_id: b.badge_id,
      badge_name: b.badge_name,
      badge_icon: b.badge_icon
    }));
};

// ========== STREAK LOGIC ==========
/**
 * Update behavior metrics and check for new badges
 * NOW: Calculates from UserActivity (single source of truth)
 */
export const updateBehaviorMetrics = async (user_id, activity_type, Streak) => {
  const normalizedUserId = normalizeUserId(user_id);
  let streak = await Streak.findOne({ user_id: normalizedUserId });

  if (!streak) {
    streak = await Streak.create({
      user_id: normalizedUserId,
      current_level: 1,
      badges_earned: [],
      badge_details: [],
      is_active_today: true,
      current_streak: 1,
      longest_streak: 1,
      total_days_active: 1
    });
  }

  // ✅ Get REAL metrics from UserActivity
  const UserActivity = (await import('../models/activityModel.js')).default;
  const userActivity = await UserActivity.findOne({ user_id: normalizedUserId });

  if (userActivity) {
    const metrics = {
      total_posts: 0, // Not tracked in UserActivity
      total_reads: userActivity.read_posts?.length || 0,
      total_comments: userActivity.commented_posts?.length || 0,
      total_likes: (userActivity.upvoted_posts?.length || 0) + (userActivity.downvoted_posts?.length || 0)
    };

    // Check for new badges using REAL metrics FIRST
    const streakWithMetrics = { ...streak.toObject(), ...metrics };
    const { newBadgesEarned, newBadgeDetails } = checkAndAwardBadges(streakWithMetrics);

    // Merge new badges with existing
    const existingBadgeIds = new Set(streak.badges_earned);
    const badgesToAdd = newBadgesEarned.filter(id => !existingBadgeIds.has(id));

    if (badgesToAdd.length > 0) {
      streak.badges_earned = [...streak.badges_earned, ...badgesToAdd];
      const newDetails = newBadgeDetails.filter(b => badgesToAdd.includes(b.badge_id));
      streak.badge_details = [...streak.badge_details, ...newDetails];
    }

    // ✅ Calculate level based on badge count (single source of truth)
    streak.current_level = calculateLevelFromBadges(streak.badges_earned);
  }

  await streak.save();
  return streak;
};

/**
 * Update streak logic (consecutive day tracking)
 */
export const updateStreakLogic = async (user_id, Streak) => {
  const normalizedUserId = normalizeUserId(user_id);
  let streak = await Streak.findOne({ user_id: normalizedUserId });

  // First time user
  if (!streak) {
    streak = await Streak.create({
      user_id: normalizedUserId,
      current_streak: 1, // Start at 1 immediately
      longest_streak: 1,
      total_days_active: 1,
      last_activity_date: new Date(),
      streak_started_date: new Date(),
      is_active_today: true,
      current_level: 1,
      badges_earned: [],
      badge_details: [],
      total_posts: 0,
      total_reads: 0,
      total_comments: 0,
      total_likes: 0
    });
    return streak;
  }

  const now = new Date();

  // If streak has expired, reset it
  // But strictly, if "now" is past "expires_at", it's broken.
  // Exception: If activity is today, it's valid to extend.

  const isExpired = streak.streak_expires_at && now > streak.streak_expires_at;
  const isSameDay = hasActivityToday(streak.last_activity_date);

  if (isSameDay) {
    // Ensure expiry is set correctly even if we don't increment (e.g. recovering state)
    if (!streak.streak_expires_at) {
      streak.streak_expires_at = calculateStreakExpiry(now);
      await streak.save();
    }
    return streak;
  }

  if (isExpired) {
    streak.current_streak = 1;
    streak.last_activity_date = now;
    streak.streak_expires_at = calculateStreakExpiry(now);
    streak.streak_started_date = now;
    streak.is_active_today = true;
    streak.reset_count += 1;
    streak.total_days_active += 1;
  } else {
    // Not expired, and not same day -> Consecutive day
    streak.current_streak += 1;
    streak.last_activity_date = now;
    streak.streak_expires_at = calculateStreakExpiry(now);
    streak.total_days_active += 1;
    streak.is_active_today = true;

    // Update longest streak
    if (streak.current_streak > streak.longest_streak) {
      streak.longest_streak = streak.current_streak;
    }
  }

  await streak.save();
  return streak;
};
