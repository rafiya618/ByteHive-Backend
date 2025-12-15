// routes/preferences.js
import express from "express";
import { verifyUser } from "../middleware/authMiddleware.js";
import { getPreferences, updatePreferences } from "../controllers/preferencesController.js";

const router = express.Router();

// GET user preferences
router.get("/:userId", verifyUser, getPreferences);

// UPDATE user preferences  
router.put("/:userId", verifyUser, updatePreferences);

export default router;
