import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Community from '../models/Community.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // For demo purposes - skip JWT verification and use dummy user
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      username: "dummyuser",
      email: "dummy@example.com"
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const checkCommunityAdmin = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.community = community;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};