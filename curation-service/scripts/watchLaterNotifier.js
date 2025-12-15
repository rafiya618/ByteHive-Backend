// scripts/watchLaterNotifier.js
// Scheduled job to notify users if a post in 'Watch Later' is not viewed in 7 days
import mongoose from 'mongoose';
import SavedPost from '../models/savedPost.js';
import History from '../models/history.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005/api/notifications';
const MONGO_URI = process.env.MONGO_URI;

async function sendNotification(userId, postId) {
  try {
    await axios.post(NOTIFICATION_SERVICE_URL, {
      userId,
      type: 'reminder',
      message: 'You have a post in Watch Later that you haven\'t viewed in 7 days.',
      postId
    });
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }
}

async function checkWatchLater() {
  await mongoose.connect(MONGO_URI);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Find all watch later posts saved more than 7 days ago
  const watchLaterPosts = await SavedPost.find({
    category: 'Watch Later',
    savedAt: { $lte: sevenDaysAgo }
  });
  for (const saved of watchLaterPosts) {
    // Check if user has viewed this post after saving
    const viewed = await History.findOne({
      userId: saved.userId,
      postId: saved.postId,
      viewedAt: { $gte: saved.savedAt }
    });
    if (!viewed) {
      await sendNotification(saved.userId, saved.postId);
    }
  }
  await mongoose.disconnect();
}

checkWatchLater().then(() => {
  console.log('Watch Later notification job completed.');
  process.exit(0);
});
