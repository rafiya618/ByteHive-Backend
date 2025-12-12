import express from 'express';
const router = express.Router();
import {
  recordView,
  getHistory,
  searchHistory,
  deleteHistoryItems,
  clearHistory
} from '../controllers/historyController.js';

// Record a view
router.post('/', recordView);

// Get user's history
router.get('/', getHistory);

// Search history
router.get('/search', searchHistory);

// Delete specific history items
router.delete('/items', deleteHistoryItems);

// Clear all history
router.delete('/clear', clearHistory);

export default router;