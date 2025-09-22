import express from 'express';
import { 
  createCommunity,
  updateCommunity,
  deleteCommunity,
  discoverCommunities,
  getCommunityDetails,
  followCommunity,
  unfollowCommunity,
  updateCommunitySettings,
  addModerator,
  removeModerator,
  getUserCommunities
} from '../controllers/communityController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';
import { validateCommunity, handleValidationErrors } from '../utils/validation.js';

const router = express.Router();

// Public routes
router.get('/discover', discoverCommunities);
router.get('/:communityId', getCommunityDetails); // ← MISSING ROUTE ADDED

// Protected routes
router.use(authenticate);
router.get('/user/my-communities', getUserCommunities);

// Community CRUD
router.post('/', upload.single('image'), validateCommunity, handleValidationErrors, createCommunity);
router.put('/:communityId', upload.single('image'), updateCommunity); // Remove validation for updates
router.delete('/:communityId', deleteCommunity);

// Follow/Unfollow
router.post('/:communityId/follow', followCommunity);
router.delete('/:communityId/unfollow', unfollowCommunity);

// Community Settings (Admin only)
router.patch('/:communityId/settings', updateCommunitySettings);

// Moderator Management (Admin only)
router.post('/:communityId/moderators', addModerator);
router.delete('/:communityId/moderators/:userId', removeModerator);

export default router;
