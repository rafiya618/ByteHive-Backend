const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search within saved content
router.get('/saved/:userId', searchController.searchSavedContent);

// Search within view history
router.get('/history/:userId', searchController.searchViewHistory);

module.exports = router;