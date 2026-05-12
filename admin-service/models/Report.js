import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    // Who is reporting
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Snapshot of reporter info to avoid cross-service lookups
    reporterUsername: { type: String, default: "Unknown" },
    reporterProfileImage: { type: String, default: "" },

    // What is being reported
    targetType: {
      type: String,
      enum: ["post", "comment", "user", "community"],
      required: true,
      index: true
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    // Target metadata (denormalized for faster queries)
    targetTitle: { type: String },
    targetAuthorId: { type: String },
    targetAuthorUsername: { type: String },

    // Reason and details
    reason: {
      type: String,
      enum: [
        "spam",
        "hate_speech",
        "harassment",
        "fake_information",
        "violence",
        "illegal_activity",
        "other"
      ],
      required: true,
      index: true
    },

    description: {
      type: String,
      maxlength: 1000,
      default: ""
    },

    // Optional evidence (image/screenshot URLs)
    evidence: [String],

    // Report status
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
      index: true
    },

    // Admin review details
    reviewedBy: {
      type: String,
      default: null
    },

    // Admin action taken
    adminAction: {
      type: String,
      enum: ["approved", "removed", "deleted", "user_banned", "user_warned", null],
      default: null
    },

    // Admin notes/reasoning
    adminNotes: {
      type: String,
      default: ""
    },

    // When was this reviewed
    reviewedAt: {
      type: Date,
      default: null
    },

    // Ban details (if action was user_banned)
    banDuration: {
      type: Number,
      default: null // in days, null = permanent
    },

    // Track all reports on same target
    totalReportsOnTarget: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

// Index for faster queries
ReportSchema.index({ targetId: 1, status: 1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, status: 1 });

export default mongoose.model("Report", ReportSchema);
