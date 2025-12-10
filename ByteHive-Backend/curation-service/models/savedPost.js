import mongoose from 'mongoose';

const savedPostSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  postId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Saved', 'Watch Later'],
    default: 'Saved'
  },
  savedAt: {
    type: Date,
    default: Date.now
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for faster queries
savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Index for finding watch later items
savedPostSchema.index({ userId: 1, category: 1, savedAt: -1 });

export default mongoose.model('SavedPost', savedPostSchema);