import Activity from "../models/activityModel.js";

/**
 * Log user activity
 */
export const logActivity = async (req, res) => {
  try {
    const { user_id, activity_type, post_id, comment_id, activity_description } = req.body;

    // Validate input
    if (!user_id || !activity_type) {
      return res.status(400).json({
        ok: false,
        message: "user_id and activity_type are required"
      });
    }

    const validActivityTypes = ["read", "post", "comment", "like"];
    if (!validActivityTypes.includes(activity_type)) {
      return res.status(400).json({
        ok: false,
        message: `Invalid activity_type. Must be one of: ${validActivityTypes.join(", ")}`
      });
    }

    const activity = await Activity.create({
      user_id,
      activity_type,
      activity_date: new Date(),
      post_id,
      comment_id,
      activity_description
    });

    return res.status(201).json({
      ok: true,
      message: "Activity logged successfully",
      activity
    });
  } catch (err) {
    console.error("Log activity error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get user's activity history
 */
export const getUserActivityHistory = async (req, res) => {
  try {
    const { user_id } = req.params;
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

    if (!user_id) {
      return res.status(400).json({
        ok: false,
        message: "user_id is required"
      });
    }

    const activities = await Activity.find({ user_id })
      .sort({ activity_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments({ user_id });

    return res.status(200).json({
      ok: true,
      total,
      count: activities.length,
      activities
    });
  } catch (err) {
    console.error("Get user activity history error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get activity by type
 */
export const getActivityByType = async (req, res) => {
  try {
    const { user_id, activity_type } = req.params;
    const skip = parseInt(req.query.skip || "0", 10);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

    if (!user_id || !activity_type) {
      return res.status(400).json({
        ok: false,
        message: "user_id and activity_type are required"
      });
    }

    const validActivityTypes = ["read", "post", "comment", "like"];
    if (!validActivityTypes.includes(activity_type)) {
      return res.status(400).json({
        ok: false,
        message: `Invalid activity_type. Must be one of: ${validActivityTypes.join(", ")}`
      });
    }

    const activities = await Activity.find({ user_id, activity_type })
      .sort({ activity_date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments({ user_id, activity_type });

    return res.status(200).json({
      ok: true,
      total,
      count: activities.length,
      activities
    });
  } catch (err) {
    console.error("Get activity by type error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get activity summary for user (activity count by type)
 */
export const getActivitySummary = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        ok: false,
        message: "user_id is required"
      });
    }

    const summary = await Activity.aggregate([
      { $match: { user_id: Number(user_id) } },
      {
        $group: {
          _id: "$activity_type",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const total = await Activity.countDocuments({ user_id });

    return res.status(200).json({
      ok: true,
      total,
      summary: summary.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error("Get activity summary error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Get daily activity count
 */
export const getDailyActivityCount = async (req, res) => {
  try {
    const { user_id } = req.params;
    const days = parseInt(req.query.days || "30", 10);

    if (!user_id) {
      return res.status(400).json({
        ok: false,
        message: "user_id is required"
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyActivity = await Activity.aggregate([
      {
        $match: {
          user_id: Number(user_id),
          activity_date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$activity_date" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      ok: true,
      period_days: days,
      daily_activity: dailyActivity
    });
  } catch (err) {
    console.error("Get daily activity count error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};

/**
 * Delete activity (admin only)
 */
export const deleteActivity = async (req, res) => {
  try {
    const { activity_id } = req.params;

    if (!activity_id) {
      return res.status(400).json({
        ok: false,
        message: "activity_id is required"
      });
    }

    const deletedActivity = await Activity.findByIdAndDelete(activity_id);

    if (!deletedActivity) {
      return res.status(404).json({
        ok: false,
        message: "Activity not found"
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Activity deleted successfully"
    });
  } catch (err) {
    console.error("Delete activity error:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
};
