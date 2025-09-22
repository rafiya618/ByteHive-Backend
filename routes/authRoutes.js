import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Dummy login endpoint for development
router.post('/dummy-login', async (req, res) => {
  try {
    // Create or find dummy user
    let user = await User.findOne({ email: 'testuser@example.com' });
    
    if (!user) {
      user = new User({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'hashedpassword' // This won't be used
      });
      await user.save();
    }

    // Create token with your actual JWT_SECRET
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;