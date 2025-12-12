/**
 * Retention Service Helper Functions
 * Handles streak logic, level calculation, and badge management
 */

// ========== BADGE DEFINITIONS (MAX 5) ==========
export const BADGE_DEFINITIONS = [
  {
    badge_id: "novice-reader",
    badge_name: "Novice Reader",
    badge_icon: "📖",
    level: 1,
    requirement_type: "reads",
    requirement_value: 10,
    description: "Read 10 posts"
  },
  {
    badge_id: "content-creator",
    badge_name: "Content Creator",
    badge_icon: "✍️",
    level: 2,
    requirement_type: "posts",
    requirement_value: 5,
    description: "Created 5 posts"
  },
  {
    badge_id: "community-voice",
    badge_name: "Community Voice",
    badge_icon: "💬",
    level: 3,
    requirement_type: "comments",
    requirement_value: 20,
    description: "Posted 20 comments"
  },
  {
    badge_id: "super-engager",
    badge_name: "Super Engager",
    badge_icon: "⚡",
    level: 4,
    requirement_type: "likes",
    requirement_value: 25,
    description: "Given 25 likes"
  },
  {
    badge_id: "master-contributor",
    badge_name: "Master Contributor",
    badge_icon: "👑",
    level: 5,
    requirement_type: "reads",
    requirement_value: 50,
    description: "Read 50 posts"
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
 * Calculate user level based on behavior metrics (1-5)
 * Score = (posts × 3) + (comments × 2) + (reads × 1) + (likes × 0.5)
 * LIKES ARE INCLUDED in the formula to reward all engagement
 */
export const calculateLevel = (totalPosts, totalReads, totalComments, totalLikes = 0) => {
  const activityScore = (totalPosts * 3) + (totalReads * 1) + (totalComments * 2) + (totalLikes * 0.5);

  if (activityScore >= 100) return 5;
  if (activityScore >= 60) return 4;
  if (activityScore >= 30) return 3;
  if (activityScore >= 10) return 2;
  return 1;
};

// ========== BADGE SYSTEM ==========
/**
 * Check and award new badges based on user behavior (max 5 badges)
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
 */
export const updateBehaviorMetrics = async (user_id, activity_type, Streak) => {
  const normalizedUserId = normalizeUserId(user_id);
  console.log(`🔍 [Helper] updateBehaviorMetrics - Looking for user_id: ${normalizedUserId} (original: ${user_id}, type: ${typeof user_id})`);
  let streak = await Streak.findOne({ user_id: normalizedUserId });

  if (!streak) {
    console.log(`ℹ️ [Helper] No existing streak found in updateBehaviorMetrics. Creating new.`);
    streak = await Streak.create({
      user_id: normalizedUserId,
      current_level: 1,
      badges_earned: [],
      badge_details: [],
      total_posts: activity_type === "post" ? 1 : 0,
      total_reads: activity_type === "read" ? 1 : 0,
      total_comments: activity_type === "comment" ? 1 : 0,
      total_likes: activity_type === "like" ? 1 : 0,
      is_active_today: true,
      current_streak: 1,
      longest_streak: 1,
      total_days_active: 1
    });
  } else {
    // Increment activity counter based on type
    switch (activity_type) {
      case "post":
        streak.total_posts += 1;
        break;
      case "read":
        streak.total_reads += 1;
        break;
      case "comment":
        streak.total_comments += 1;
        break;
      case "like":
        streak.total_likes += 1;
        break;
      default:
        break;
    }

    // Recalculate level based on new metrics (INCLUDING likes)
    streak.current_level = calculateLevel(
      streak.total_posts,
      streak.total_reads,
      streak.total_comments,
      streak.total_likes
    );

    // Check for new badges
    const { newBadgesEarned, newBadgeDetails } = checkAndAwardBadges(streak);
    if (newBadgesEarned.length > streak.badges_earned.length) {
      streak.badges_earned = newBadgesEarned;
      streak.badge_details = newBadgeDetails;
    }
  }

  await streak.save();
  return streak;
};

/**
 * Update streak logic (consecutive day tracking)
 */
export const updateStreakLogic = async (user_id, Streak) => {
  const normalizedUserId = normalizeUserId(user_id);
  console.log(`🔍 [Helper] updateStreakLogic called for user: ${normalizedUserId} (original type: ${typeof user_id})`);
  let streak = await Streak.findOne({ user_id: normalizedUserId });

  // First time user
  if (!streak) {
    console.log(`ℹ️ [Helper] No existing streak found. Creating new streak record.`);
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
    console.log(`✅ [Helper] New streak created. current_streak: 1`);
    return streak;
  }

  console.log(`ℹ️ [Helper] Existing streak found. Current: ${streak.current_streak}, Last Active: ${streak.last_activity_date}`);

  // User already has activity today - don't update streak
  if (hasActivityToday(streak.last_activity_date)) {
    console.log(`ℹ️ [Helper] User already active today. No streak increment.`);
    return streak;
  }

  // User had activity yesterday - increment streak
  if (hadActivityYesterday(streak.last_activity_date)) {
    console.log(`ℹ️ [Helper] User active yesterday. Incrementing streak.`);
    streak.current_streak += 1;
    streak.last_activity_date = new Date();
    streak.total_days_active += 1;
    streak.is_active_today = true;

    // Update longest streak
    if (streak.current_streak > streak.longest_streak) {
      streak.longest_streak = streak.current_streak;
    }
    console.log(`✅ [Helper] Streak incremented to: ${streak.current_streak}`);
  } else {
    // User missed a day - reset streak to 1
    console.log(`⚠️ [Helper] User missed a day. Resetting streak to 1.`);
    streak.current_streak = 1;
    streak.last_activity_date = new Date();
    streak.streak_started_date = new Date();
    streak.is_active_today = true;
    streak.reset_count += 1;
  }

  await streak.save();
  return streak;
};
