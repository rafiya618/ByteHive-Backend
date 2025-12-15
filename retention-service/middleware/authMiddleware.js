import jwt from "jsonwebtoken";

// Middleware to verify JWT token
export const verifyUser = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Expected format: "Bearer <token>"
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next(); // Proceed to route handler
  } catch (err) {
    console.error('❌ Auth failed:', err.message);
    return res.status(401).json({ success: false, message: "Unauthorized", error: err.message });
  }
};
