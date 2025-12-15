import express from 'express';
const router = express.Router();
import {
  savePost,
  getSavedPosts,
  searchSavedPosts,
  checkSavedStatus
} from '../controllers/savedPostController.js';

// Save or unsave a post
router.post('/save', savePost);

// Get all saved posts
router.get('/', getSavedPosts);

// Search saved posts
router.get('/search', searchSavedPosts);

// Check if a post is saved
router.get('/check/:postId', checkSavedStatus);

export default router;