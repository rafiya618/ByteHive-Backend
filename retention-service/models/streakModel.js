import mongoose from "mongoose";

const BadgeSchema = new mongoose.Schema(
  {
    badge_id: { type: String },
    badge_name: { type: String, required: true },
    badge_icon: { type: String },
    level: { type: Number, required: true },
    requirement_type: {
      type: String,
      enum: ["streak", "posts", "reads", "comments", "likes"],
      required: true
    },
    requirement_value: { type: Number, required: true },
    description: { type: String },
    earned_at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const StreakSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      unique: true,
      index: true
    },
    current_streak: {
      type: Number,
      default: 0
    },
    longest_streak: {
      type: Number,
      default: 0
    },
    total_days_active: {
      type: Number,
      default: 0
    },
    last_activity_date: {
      type: Date,
      default: null
    },
    streak_started_date: {
      type: Date,
      default: null
    },
    streak_expires_at: {
      type: Date,
      default: null
    },
    timezone: {
      type: String,
      default: "UTC"
    },
    // Level system based on behavior (calculated from UserActivity)
    current_level: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    },
    // Badges - max 5 (Levels 1-5)
    badges_earned: {
      type: [String],
      default: [],
      maxlength: 5
    },
    badge_details: [BadgeSchema],
    reset_count: {
      type: Number,
      default: 0
    },
    is_active_today: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Streak", StreakSchema);
