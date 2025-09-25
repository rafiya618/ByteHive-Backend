const SavedPost = require('../models/SavedPost');

// Check for Watch Later items older than 7 days
const checkWatchLaterReminders = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdueItems = await SavedPost.find({
      category: 'Watch Later',
      savedAt: { $lte: sevenDaysAgo },
      reminderSent: false
    }).populate('postId');

    for (const item of overdueItems) {
      // In a real implementation, you would send actual notifications
      // For now just log the reminder
      console.log(`REMINDER: User ${item.userId} has an unviewed "Watch Later" item: "${item.postId.title}"`);
      
      // Mark as reminder sent
      item.reminderSent = true;
      await item.save();
      
      // Here  integrate with  notification system
      // Example: sendNotification(item.userId, item.postId);
    }

    console.log(`Processed ${overdueItems.length} reminder notifications`);
  } catch (error) {
    console.error('Error checking Watch Later reminders:', error);
  }
};

// Manual trigger for testing
const triggerReminders = async (req, res) => {
  try {
    await checkWatchLaterReminders();
    res.json({ message: 'Reminders processed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error processing reminders' });
  }
};

module.exports = {
  checkWatchLaterReminders,
  triggerReminders
};