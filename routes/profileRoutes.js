const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { getProfile, updateProfile } = require('../controllers/profileController');

// GET profile info
router.get('/:userId', getProfile);

// PUT update profile info (with optional image)
router.put('/:userId', upload.single('profileImage'), updateProfile);

module.exports = router;
