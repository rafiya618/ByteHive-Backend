import express from "express";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  triggerAnnouncementSweep
} from "../controllers/announcementController.js";

const router = express.Router();

router.get("/", listAnnouncements);
router.post("/", createAnnouncement);
router.delete("/:id", deleteAnnouncement);
router.post("/process-due", triggerAnnouncementSweep);

export default router;