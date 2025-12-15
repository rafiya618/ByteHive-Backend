import express from 'express';
import { chatAboutWord } from '../controllers/chatController.js';

const router = express.Router();

// POST /smart-reading/chat
router.post('/chat', chatAboutWord);

export default router;