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
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
historySchema.index({ userId: 1, viewedAt: -1 });

// Ensure unique views within a time window (e.g., don't record multiple views of the same post within 1 hour)
historySchema.index(
  { userId: 1, postId: 1, viewedAt: 1 },
  { 
    unique: true, 
    partialFilterExpression: {
      viewedAt: { 
        $gt: new Date(Date.now() - 3600000) // 1 hour
      }
    }
  }
);

export default mongoose.model('History', historySchema);