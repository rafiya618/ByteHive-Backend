import Announcement from "../models/Announcement.js";
import { deliverAnnouncement, processDueAnnouncements } from "../services/announcementService.js";

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience = "all_active", scheduledFor = null, createdBy = "admin-system" } = req.body;

    if (!title || !message) {
      return res.status(400).json({ ok: false, message: "Title and message are required" });
    }

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    if (scheduledFor && Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ ok: false, message: "scheduledFor must be a valid date" });
    }

    const announcement = await Announcement.create({
      title,
      message,
      audience,
      scheduledFor: scheduledDate,
      status: scheduledDate && scheduledDate > new Date() ? "scheduled" : "sending",
      createdBy
    });

    if (!scheduledDate || scheduledDate <= new Date()) {
      const delivery = await deliverAnnouncement(announcement);
      return res.status(201).json({ ok: true, announcement: await Announcement.findById(announcement._id).lean(), delivery });
    }

    return res.status(201).json({ ok: true, announcement: await Announcement.findById(announcement._id).lean() });
  } catch (err) {
    console.error("Create announcement error:", err);
    return res.status(500).json({ ok: false, message: "Failed to create announcement", error: err.message });
  }
};

export const listAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, announcements });
  } catch (err) {
    console.error("List announcements error:", err);
    return res.status(500).json({ ok: false, message: "Failed to load announcements", error: err.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ ok: false, message: "Announcement not found" });
    }

    if (announcement.status === "sending") {
      return res.status(409).json({ ok: false, message: "Announcement is currently being sent and cannot be deleted" });
    }

    await Announcement.findByIdAndDelete(id);
    return res.json({ ok: true, message: "Announcement deleted" });
  } catch (err) {
    console.error("Delete announcement error:", err);
    return res.status(500).json({ ok: false, message: "Failed to delete announcement", error: err.message });
  }
};

export const triggerAnnouncementSweep = async (_req, res) => {
  try {
    const results = await processDueAnnouncements();
    return res.json({ ok: true, results });
  } catch (err) {
    console.error("Announcement sweep error:", err);
    return res.status(500).json({ ok: false, message: "Failed to process announcements", error: err.message });
  }
};