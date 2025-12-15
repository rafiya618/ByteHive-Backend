import notificationModel from "../models/notificationModel.js";

// @desc Get all notifications for a user
// @route GET /api/notifications/:userId
// @access Private (depends on your auth)
export const getNotifications = async (req, res) => {
  try {
    // { recieverId: req.params.userId }
    // console.log('notification backend')
    const notifications = await notificationModel.find({ receiverId: req.params.userId })
      .sort({ createdAt: -1 });
    const unReadCount  = await notificationModel.countDocuments({receiverId: req.params.userId, status: "unread"})
    res.send({notifications, unReadCount});

    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc Mark a notification as read
// @route PUT /api/notifications/:id/read
// @access Private
export const markNotificationAsRead = async (req, res) => {
  try {
    const not = await notificationModel.updateMany(
      { receiverId: req.params.userId, status: "unread" },
      { $set: { status: "read" } }, {new: true});
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const  deleteNotification = async (req, res) => {
  try {
    await notificationModel.findByIdAndDelete(req.params.notificationId)
    return res.send("Notification deleted successfully.")
  } catch (error) {
    
  }
}

