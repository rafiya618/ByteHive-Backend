import express from 'express';
import {
  simplifyPost,
  getSimplification,
} from '../controllers/simplificationController.js';

const router = express.Router();

// POST /smart-reading/simplify
router.post('/simplify', simplifyPost);

// GET /smart-reading/simplification?postId=123&level=detailed
router.get('/simplification', getSimplification);

export default router;
