const express = require('express');
const router = express.Router();
const savedPostsController = require('../controllers/savedPostsController');

// Save a post
router.post('/', savedPostsController.savePost);

// Get user's saved posts
router.get('/user/:userId', savedPostsController.getSavedPosts);

// Get saved posts by category
router.get('/user/:userId/category/:category', savedPostsController.getSavedPostsByCategory);

// Remove saved post
router.delete('/user/:userId/post/:postId', savedPostsController.removeSavedPost);

module.exports = router;