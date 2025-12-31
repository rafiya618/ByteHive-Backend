import express from "express";
import {
  submitReport,
  getReports,
  getReportDetails,
  takeReportAction,
  getReportStats
} from "../controllers/reportController.js";

const router = express.Router();

// User-facing routes (no auth required for submit, but user ID in body)
router.post("/", submitReport); // User submits a report

// Admin routes (admin auth should be added as middleware in server.js)
router.get("/", getReports); // Get all reports with filters
router.get("/stats", getReportStats); // Get report statistics
router.get("/:reportId", getReportDetails); // Get single report with full context
router.patch("/:reportId/action", takeReportAction); // Admin takes action on report

export default router;
