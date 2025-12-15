import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('📋 No token provided');
      // Allow anonymous requests for most endpoints
      return next();
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded._id || decoded.id || decoded.userId;
    console.log(`✅ Auth middleware - User ID: ${req.userId}`);
    next();
  } catch (error) {
    console.log('⚠️ Token verification failed:', error.message);
    // Don't block the request, continue as anonymous
    next();
  }
};
