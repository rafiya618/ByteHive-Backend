import express from 'express';
import {
  warnUser,
  suspendUser,
  unsuspendUser,
  getUserById
} from '../controllers/moderationController.js';

const router = express.Router();

// Get user by ID (for cross-service lookups)
router.get('/:id', getUserById);

// Warn user
router.patch('/:id/warn', warnUser);

// Suspend/ban user
router.patch('/:id/suspend', suspendUser);

// Unsuspend/unban user
router.patch('/:id/unsuspend', unsuspendUser);

export default router;
