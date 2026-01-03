import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  listPostsAdmin,
  getPostDetailsAdmin,
  approvePost,
  rejectPost,
  deletePostAdmin,
  editPostAdmin,
  getPopularPostsAdmin,
  getNewPostsAdmin,
  getCommunityPostsAdmin,
} from '../controllers/adminPostController.js';

const router = express.Router();

// Apply admin auth middleware to all routes
router.use(adminAuth);

/**
 * 4.1 - List all posts with filters and pagination
 * GET /admin/posts?page=1&limit=10&search=&community=&category=&status=&sortBy=&order=
 */
router.get('/', listPostsAdmin);

/**
 * 4.2.3 - Get popular posts
 * GET /admin/posts/popular?limit=10&community=&category=
 */
router.get('/popular', getPopularPostsAdmin);

/**
 * 4.2.3 - Get new posts
 * GET /admin/posts/new?limit=10&community=&category=
 */
router.get('/new', getNewPostsAdmin);

/**
 * Get posts by community
 * GET /admin/posts/community/:communityId?page=1&limit=10&status=&category=
 */
router.get('/community/:communityId', getCommunityPostsAdmin);

/**
 * Get post details
 * GET /admin/posts/:postId
 */
router.get('/:postId', getPostDetailsAdmin);

/**
 * 4.3.1 - Approve a pending post
 * PUT /admin/posts/:postId/approve
 */
router.put('/:postId/approve', approvePost);

/**
 * 4.3.2 - Reject a pending post
 * PUT /admin/posts/:postId/reject
 * Body: { reason: "Content violates guidelines" }
 */
router.put('/:postId/reject', rejectPost);

/**
 * 4.3.3 - Delete a post
 * DELETE /admin/posts/:postId
 */
router.delete('/:postId', deletePostAdmin);

/**
 * 4.3.4 - Edit post title/content (for corrections)
 * PUT /admin/posts/:postId/edit
 * Body: { post_title, post_description, small_description }
 */
router.put('/:postId/edit', editPostAdmin);

export default router;
