// Instruction Notes:
// 1) Event logging: Stores user actions for posts/communities (Requirement: store user's event in logs)
//    We use logs later for batch summaries, ranking, and trending (not using the views field).
//    Actions: read, upvote, comment, join, share (extensible).
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ["post", "community"], required: true },
  entityId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: ["read", "upvote", "comment", "join", "share"],
    required: true,
  },
  metadata: { type: Object, default: {} }, // tags, timeSpentSec, source, etc.
  timestamp: { type: Date, default: Date.now, index: true }
});

schema.index({ userId: 1, timestamp: -1 });
schema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export default (mongoose.models.InteractionLog || mongoose.model("InteractionLog", schema));
