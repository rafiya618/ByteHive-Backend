import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // --- Users ---
    receiverId: { type: String, ref: "User", required: true },
    senderId: { type: String, ref: "notificationCache", default: null },

    // --- Trigger/Event ---
    triggerType: {
      type: String,
      enum: ["comment", "reply", "likeComment", "likePost", "mention", "follow", "friendRequest", "connectionAccepted", "join_request", "request_approved", "community_follow", "newPost", "storyUpdate", "liveStream", "eventInvite", "streak_warning", "system", "security", "aggregate"]
    },
    // triggerId: { type: String }, // Optional if aggregated; otherwise used as fallback

    // --- Content ---
    message: { type: String, required: true, trim: true },

    // --- Entity References ---
    postId: { type: String, ref: "Post" },
    entityId: { type: String }, // could be commentId, profileId, etc.
    entityType: {
      type: String,
      enum: ["post", "comment", "reply", "user", "community", "system", "security"]
    },
    communityName: { type: String },
    parentId: { type: String },

    // --- Navigation Payload ---
    navigate: { type: String },

    // --- Channels & Delivery ---
    channels: {
      type: [String],
      enum: ["in-app", "push", "email"],
      default: ["in-app"]
    },

    // --- Status ---
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread"
    },

    // --- Aggregation ---
    groupKey: { type: String, index: true, default: null },
    meta: {
      count: { type: Number, default: 1 },
      lastActors: { type: [String], default: [] },
      threshold: { type: Number, default: 4 },

      // ✅ New: Track triggerIds per actor for safe deletion
      triggerIds: {
        type: Map,
        of: [String],
        default: () => new Map()
      }
    },

    // --- Expiry ---
    isStale: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for sender details to avoid overwriting raw senderId string
notificationSchema.virtual('senderDetails', {
  ref: 'notificationCache',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

// Optional indexes (keep if needed)
// notificationSchema.index({ receiverId: 1, status: 1 });
notificationSchema.index({ receiverId: 1, groupKey: 1 });
// notificationSchema.index({ createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
