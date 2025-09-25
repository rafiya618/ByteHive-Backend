const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  category: {
    type: String,
    enum: ['Saved', 'Watch Later'],
    required: true
  },
  savedAt: {
    type: Date,
    default: Date.now
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
});

savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('SavedPost', savedPostSchema);
