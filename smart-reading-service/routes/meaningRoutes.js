import express from 'express';
import {
  getMeaning,
  searchMeanings,
} from '../controllers/meaningController.js';

const router = express.Router();

// GET /smart-reading/meanings?word=react
router.get('/meanings', getMeaning);

// GET /smart-reading/meanings/search?query=programming
router.get('/meanings/search', searchMeanings);

export default router;
