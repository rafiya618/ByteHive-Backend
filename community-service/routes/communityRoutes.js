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
  getUserCommunities,
  getAllCommunities
} from '../controllers/communityController.js';
import { upload } from '../config/cloudinary.js';
import { addPostToCommunity, removePostFromCommunity } from '../controllers/communityController.js';

const router = express.Router();

// All routes are now public - no authentication required
router.get('/discover', discoverCommunities);
router.get('/all', getAllCommunities);
router.get('/user/:userId', getUserCommunities);
router.get('/:communityId', getCommunityDetails);

// Community CRUD
router.post('/', upload.single('image'), createCommunity);
router.put('/:communityId', upload.single('image'), updateCommunity);
router.delete('/:communityId', deleteCommunity);

// Follow/Unfollow
router.post('/:communityId/follow', followCommunity);
router.delete('/:communityId/unfollow', unfollowCommunity);

// Community Settings
router.patch('/:communityId/settings', updateCommunitySettings);

// Moderator Management
router.post('/:communityId/moderators', addModerator);
router.delete('/:communityId/moderators/:userId', removeModerator);

// Add/Remove Posts to/from Community
router.post('/:communityId/posts', addPostToCommunity);
router.delete('/:communityId/posts/:postId', removePostFromCommunity);

export default router;
