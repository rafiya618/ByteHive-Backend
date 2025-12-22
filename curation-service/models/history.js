import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  postId: {
    type: String,
    required: true
  },
  viewedDate: {
    type: Date,
    required: true,
    index: true,
    // Stores the calendar date (YYYY-MM-DD at 00:00:00 UTC)
  },
  firstViewed: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound index for efficient queries (sorted by most recent day, then by most recent access within day)
historySchema.index({ userId: 1, viewedDate: -1, lastAccessed: -1 });

// UNIQUE constraint: One history record per user per post PER DAY
// This allows the same post to have multiple entries across different days
historySchema.index(
  { userId: 1, postId: 1, viewedDate: 1 },
  { unique: true }
);

export default mongoose.model('History', historySchema);