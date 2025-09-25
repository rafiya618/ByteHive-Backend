const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
console.log('Attempting to connect to MongoDB...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'URI found in env' : 'URI not found');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB Atlas');
  console.log('📊 Database: bytehive');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Import routes
const savedPostsRoutes = require('./routes/savedPosts');
const viewHistoryRoutes = require('./routes/viewHistory');
const searchRoutes = require('./routes/search');
const postsRoutes = require('./routes/posts');

// Import notification scheduler
const { checkWatchLaterReminders } = require('./middleware/notificationScheduler');

// Routes
app.use('/api/saved-posts', savedPostsRoutes);
app.use('/api/view-history', viewHistoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/posts', postsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Content Curation API is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'Content Curation Backend is running!',
    endpoints: {
      health: '/api/health',
      savedPosts: '/api/saved-posts',
      viewHistory: '/api/view-history',
      search: '/api/search',
      posts: '/api/posts'
    }
  });
});

// Schedule reminder notifications - runs daily at 9 AM (FIXED cron expression)
cron.schedule('0 9 * * *', () => {
  console.log('Running daily reminder check...');
  checkWatchLaterReminders();
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;