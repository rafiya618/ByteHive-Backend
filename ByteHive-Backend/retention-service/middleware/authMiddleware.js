import jwt from "jsonwebtoken";

// Middleware to verify JWT token
export const verifyUser = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Expected format: "Bearer <token>"
    const token = authHeader.split(" ")[1];
    console.log('🔐 Auth middleware - Token extracted:', token ? 'Present' : 'Missing');
    if (!token) {
      return res.status(401).json({ success: false, message: "Invalid token format" });
    }

    // Verify token
    console.log('🔐 Auth middleware - JWT_SECRET available:', !!process.env.JWT_SECRET);
    console.log('🔐 Auth middleware - JWT_SECRET value:', process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth middleware - Token verified successfully, userId:', decoded._id);
    req.user = decoded; // Attach user info to request
    next(); // Proceed to route handler
  } catch (err) {
    console.error('❌ Auth middleware - JWT verification failed:', err.message);
    return res.status(401).json({ success: false, message: "Unauthorized", error: err.message });
  }
};
