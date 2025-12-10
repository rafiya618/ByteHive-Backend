import express from 'express';
import { searchBlogs, getRelatedBlogs } from '../controllers/searchController.js';

const router = express.Router();

// GET /smart-reading/search?keyword=react
router.get('/search', searchBlogs);

// GET /smart-reading/related-blogs?keyword=javascript
router.get('/related-blogs', getRelatedBlogs);

export default router;
