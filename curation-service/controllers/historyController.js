import History from '../models/history.js';

/**
 * Record a post view
 * UPDATED: Day-based deduplication logic
 * - Same day, same post: Updates lastAccessed and increments viewCount
 * - Different day, same post: Creates new history entry
 * - viewedDate is the calendar date (start of day in UTC)
 */
const recordView = async (req, res, next) => {
  try {
    const { postId, userId } = req.body;

    // Calculate viewedDate as start of current day in UTC
    const now = new Date();
    const viewedDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    // Upsert: Update existing entry for this day, or create new
    const history = await History.findOneAndUpdate(
      { userId, postId, viewedDate }, // Find by user, post, AND date
      {
        $set: {
          lastAccessed: new Date()
        },
        $inc: {
          viewCount: 1
        },
        $setOnInsert: {
          firstViewed: new Date(),
          viewedDate: viewedDate
        }
      },
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return updated document
        runValidators: true
      }
    );

    res.status(201).json({
      message: history.viewCount === 1 ? 'View recorded successfully' : 'View updated successfully',
      history
    });
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ message: 'Error recording view', error: error.message });
  }
};

/**
 * Get user's view history
 * UPDATED: Sorts by viewedDate (most recent day first), then by lastAccessed (most recent time within day)
 */
const getHistory = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

    const history = await History.find({ userId })
      .sort({ viewedDate: -1, lastAccessed: -1 }) // Sort by most recent day, then most recent access within day
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await History.countDocuments({ userId });

    res.json({
      success: true,
      data: history,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching history:', error);
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