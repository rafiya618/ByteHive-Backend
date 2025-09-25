const SavedPost = require('../models/SavedPost');
const ViewHistory = require('../models/ViewHistory');
const Post = require('../models/Post');

// Search within saved content
exports.searchSavedContent = async (req, res) => {
  try {
    const { userId } = req.params;
    const { q: query, category, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const skip = (page - 1) * limit;

    // Build match condition for saved posts
    const matchCondition = { userId };
    if (category) {
      matchCondition.category = category;
    }

    const searchResults = await SavedPost.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'posts',
          localField: 'postId',
          foreignField: '_id',
          as: 'post'
        }
      },
      { $unwind: '$post' },
      {
        $match: {
          $or: [
            { 'post.title': { $regex: query, $options: 'i' } },
            { 'post.content': { $regex: query, $options: 'i' } },
            { 'post.tags': { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $sort: { savedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalResults = await SavedPost.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'posts',
          localField: 'postId',
          foreignField: '_id',
          as: 'post'
        }
      },
      { $unwind: '$post' },
      {
        $match: {
          $or: [
            { 'post.title': { $regex: query, $options: 'i' } },
            { 'post.content': { $regex: query, $options: 'i' } },
            { 'post.tags': { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $count: 'total' }
    ]);

    const total = totalResults[0]?.total || 0;

    res.json({
      results: searchResults,
      query,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error searching saved content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Search within view history
exports.searchViewHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { q: query, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const skip = (page - 1) * limit;

    const searchResults = await ViewHistory.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'posts',
          localField: 'postId',
          foreignField: '_id',
          as: 'post'
        }
      },
      { $unwind: '$post' },
      {
        $match: {
          $or: [
            { 'post.title': { $regex: query, $options: 'i' } },
            { 'post.content': { $regex: query, $options: 'i' } },
            { 'post.tags': { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $sort: { viewedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    const totalResults = await ViewHistory.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: 'posts',
          localField: 'postId',
          foreignField: '_id',
          as: 'post'
        }
      },
      { $unwind: '$post' },
      {
        $match: {
          $or: [
            { 'post.title': { $regex: query, $options: 'i' } },
            { 'post.content': { $regex: query, $options: 'i' } },
            { 'post.tags': { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $count: 'total' }
    ]);

    const total = totalResults[0]?.total || 0;

    res.json({
      results: searchResults,
      query,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error searching view history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
