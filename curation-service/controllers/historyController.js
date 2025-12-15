import History from '../models/history.js';

// Record a post view
const recordView = async (req, res, next) => {
  try {
    const { postId, userId } = req.body;

    const history = new History({
      userId,
      postId
    });

    await history.save();
    res.status(201).json({ message: 'View recorded successfully', history });
  } catch (error) {
    // If error is due to duplicate view within time window, just return success
    if (error.code === 11000) {
      return res.json({ message: 'View already recorded' });
    }
    res.status(500).json({ message: 'Error recording view', error: error.message });
  }
};

// Get user's view history
const getHistory = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

    const history = await History.find({ userId })
      .sort({ viewedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await History.countDocuments({ userId });

    res.json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};

// Search within history
const searchHistory = async (req, res) => {
  try {
    const { userId, q } = req.query;

    const history = await History.find({
      userId,
      $or: [
        { postTitle: { $regex: q, $options: 'i' } },
        { postDescription: { $regex: q, $options: 'i' } }
      ]
    }).sort({ viewedAt: -1 });

    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: 'Error searching history', error: error.message });
  }
};

// Delete specific history items
const deleteHistoryItems = async (req, res) => {
  try {
    const { userId, itemIds } = req.body;

    await History.deleteMany({
      userId,
      _id: { $in: itemIds }
    });

    res.json({ message: 'History items deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting history items', error: error.message });
  }
};

// Clear all history
const clearHistory = async (req, res) => {
  try {
    const { userId } = req.body;
    await History.deleteMany({ userId });
    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing history', error: error.message });
  }
};

export {
  recordView,
  getHistory,
  searchHistory,
  deleteHistoryItems,
  clearHistory
};