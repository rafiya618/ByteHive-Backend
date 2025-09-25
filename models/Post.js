const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

postSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Post', postSchema);