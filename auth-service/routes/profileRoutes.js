import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import {
  getProfile,
  setupProfile,
  updateProfile
} from '../controllers/profileController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:userId', verifyUser, getProfile);
router.post("/setup/:userId", verifyUser, setupProfile)
router.put('/:userId', verifyUser, upload.single('profileImage'), updateProfile);

export default router;
