// Updated routes/viewHistory.js
const express = require('express');
const router = express.Router();
const viewHistoryController = require('../controllers/viewHistoryController');

// Track post view
router.post('/', viewHistoryController.trackView);

// Get user's view history
router.get('/user/:userId', viewHistoryController.getViewHistory);

// Clear all view history
router.delete('/user/:userId', viewHistoryController.clearViewHistory);

// Remove specific history item
router.delete('/user/:userId/item/:historyId', viewHistoryController.removeHistoryItem);

// Remove multiple history items
router.post('/user/:userId/remove-multiple', viewHistoryController.removeMultipleHistoryItems);

module.exports = router;