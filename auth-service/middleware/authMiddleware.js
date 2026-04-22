import jwt from "jsonwebtoken";
import { userModel } from "../models/userModel.js";

// Middleware to verify JWT token
export const verifyUser = async (req, res, next) => {
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
    
    // Check user suspension/block status in real-time
    const user = await userModel.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Check if user is suspended
    if (user.isSuspended) {
      // Check if suspension is temporary and has expired
      if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
        // Lift temporary suspension
        user.isSuspended = false;
        user.suspendedUntil = null;
        user.suspensionReason = '';
        await user.save();
      } else {
        // Still suspended
        const suspensionMessage = user.suspendedUntil
          ? `Your account is temporarily suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}`
          : `Your account has been permanently suspended`;
        return res.status(403).json({ success: false, message: suspensionMessage });
      }
    }

    // Check if user is blocked
    if (user.status === "blocked") {
      return res.status(403).json({ success: false, message: "Your account has been blocked by an administrator" });
    }

    req.user = decoded; // Attach user info to request
    next(); // Proceed to route handler
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized", error: err.message });
  }
};

export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized: Admins only" });
    }

    // Check admin suspension/block status
    const user = await userModel.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: "Admin account is suspended" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Admin account has been blocked" });
    }

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
