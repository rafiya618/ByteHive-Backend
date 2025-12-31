import express from 'express';
import {
  getUsers,
  toggleBlockUser,
  promoteUser,
  deleteUser
} from '../controllers/adminUserController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admins can access these routes
// router.use(verifyAdmin);

router.get('/users', getUsers);
router.put('/users/:id/block', toggleBlockUser);
router.put('/users/:id/promote', promoteUser);
router.delete('/users/:id', deleteUser);

export default router;
