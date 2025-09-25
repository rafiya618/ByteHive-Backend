const ViewHistory = require('../models/ViewHistory');
const SavedPost = require('../models/SavedPost');
const Post = require('../models/Post');
const mongoose = require('mongoose');

// Track post view - Allow multiple views of same post
exports.trackView = async (req, res) => {
  try {
    console.log('Track view request:', req.body); // Debug log
    
    const { userId, postId, title, content, author, tags = [] } = req.body;

    if (!userId || !postId) {
      return res.status(400).json({ error: 'userId and postId are required' });
    }

    //  Better ObjectId handling - same logic as save
    let objectId;
    const postIdStr = String(postId);
    
    if (mongoose.Types.ObjectId.isValid(postIdStr) && postIdStr.length === 24) {
      objectId = new mongoose.Types.ObjectId(postIdStr);
    } else {
      // Create consistent ObjectId from string ID
      const hash = postIdStr.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hexString = Math.abs(hash).toString(16).padStart(24, '0').substring(0, 24);
      objectId = new mongoose.Types.ObjectId(hexString);
    }

    console.log('Tracking view for post ID:', postIdStr, '-> ObjectId:', objectId);

    // Check if post exists or create it
    let post = await Post.findById(objectId);
    if (!post) {
      post = new Post({
        _id: objectId,
        title: title || 'Untitled Post',
        content: content || 'No content provided',
        author: author || 'Anonymous',
        category: 'General',
        tags: Array.isArray(tags) ? tags : []
      });
      await post.save();
      console.log('Created new post for tracking:', post._id);
    }

    
    // This allows multiple views of the same post to be tracked
    const viewHistory = new ViewHistory({
      userId,
      postId: objectId,
      viewedAt: new Date() // Explicitly set current timestamp
    });

    await viewHistory.save();
    console.log('View tracked successfully:', viewHistory._id, 'at', viewHistory.viewedAt);

    // Check if this post was in "Watch Later" and mark as viewed
    const watchLaterPost = await SavedPost.findOne({
      userId,
      postId: objectId,
      category: 'Watch Later'
    });

    if (watchLaterPost) {
      watchLaterPost.reminderSent = true; // Prevent reminder notifications
      await watchLaterPost.save();
      console.log('Marked Watch Later post as viewed:', watchLaterPost._id);
    }

    res.status(201).json({ 
      message: 'View tracked successfully', 
      viewHistory: {
        _id: viewHistory._id,
        userId: viewHistory.userId,
        postId: viewHistory.postId,
        viewedAt: viewHistory.viewedAt
      }
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Remove specific history item
exports.removeHistoryItem = async (req, res) => {
  try {
    const { userId, historyId } = req.params;
    
    const result = await ViewHistory.findOneAndDelete({ 
      _id: historyId, 
      userId 
    });
    
    if (!result) {
      return res.status(404).json({ error: 'History item not found' });
    }
    
    console.log(`Removed history item ${historyId} for user ${userId}`);
    res.json({ message: 'History item removed successfully' });
  } catch (error) {
    console.error('Error removing history item:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Remove multiple history items
exports.removeMultipleHistoryItems = async (req, res) => {
  try {
    const { userId } = req.params;
    const { historyIds } = req.body;
    
    if (!Array.isArray(historyIds) || historyIds.length === 0) {
      return res.status(400).json({ error: 'historyIds array is required' });
    }
    
    const result = await ViewHistory.deleteMany({
      _id: { $in: historyIds },
      userId
    });
    
    console.log(`Removed ${result.deletedCount} history items for user ${userId}`);
    res.json({ 
      message: `${result.deletedCount} history items removed successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error removing multiple history items:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}; 
  


// Get user's view history
exports.getViewHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log('Get view history for user:', userId);

    const skip = (page - 1) * limit;

    // FIXED: Get ALL view history entries, including duplicates
    const viewHistory = await ViewHistory.find({ userId })
      .populate('postId')
      .sort({ viewedAt: -1 }) // Most recent first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ViewHistory.countDocuments({ userId });

    console.log(`Found ${viewHistory.length} history items for user ${userId} (total: ${total})`);

    res.json({
      viewHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + viewHistory.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching view history:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Clear view history
exports.clearViewHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await ViewHistory.deleteMany({ userId });
    
    console.log(`Cleared ${result.deletedCount} history items for user ${userId}`);
    res.json({ 
      message: 'View history cleared successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing view history:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}