import express from "express";
import { getDashboardStats, getRecentActivity } from "../controllers/dashboardController.js";

const router = express.Router();

// Core dashboard metrics
router.get("/stats", getDashboardStats);

// Recent activity (placeholder; replace with real activity store later)
router.get("/activity", getRecentActivity);

export default router;
