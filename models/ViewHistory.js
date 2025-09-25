const mongoose = require('mongoose');

const viewHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
});

viewHistorySchema.index({ userId: 1, viewedAt: -1 });

module.exports = mongoose.model('ViewHistory', viewHistorySchema);
