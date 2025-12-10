import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { config } from './config/env.js';
import connectDB from './config/db.js';
import { authMiddleware } from './middleware/authMiddleware.js';

// Import routes
import meaningRoutes from './routes/meaningRoutes.js';
import simplificationRoutes from './routes/simplificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'smart-reading-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/smart-reading', meaningRoutes);
app.use('/smart-reading', simplificationRoutes);
app.use('/smart-reading', searchRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`\n🚀 Smart Reading Service listening on port ${config.port}`);
      console.log(`📍 Health check: http://localhost:${config.port}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
