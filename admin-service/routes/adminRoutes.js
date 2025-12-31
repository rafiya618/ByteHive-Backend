import express from "express";
import { adminAuth } from "../middleware/adminMiddleware.js"; // Admin auth middleware
import { getUsers, updateUser } from "../controllers/adminController.js";

const router = express.Router();

// User Management
// Fetch users (cursor pagination, search, filters)
router.get("/users", adminAuth, getUsers);

// Update user (block/unblock, promote, soft delete)
router.patch("/users/:id", adminAuth, updateUser);

export default router;
