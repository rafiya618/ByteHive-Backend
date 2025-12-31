import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  listCommunitiesAdmin,
  getCommunityAdmin,
  getCommunityPostsAdmin,
  addModeratorAdmin,
  removeModeratorAdmin,
  deleteCommunityAdmin,
} from '../controllers/adminCommunityController.js';

const router = express.Router();

// router.use(adminAuth);

router.get('/', listCommunitiesAdmin);
router.get('/:communityId/posts', getCommunityPostsAdmin);
router.get('/:communityId', getCommunityAdmin);
router.post('/:communityId/moderators', addModeratorAdmin);
router.delete('/:communityId/moderators/:userId', removeModeratorAdmin);
router.delete('/:communityId', deleteCommunityAdmin);

export default router;
