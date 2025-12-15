// controllers/eventController.js
import Event from "../models/Event.js";
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "../utils/googleCalendar.js";

const eventQueue = new Queue("eventJobs", { connection: redisConnection });

// Helper to read google refresh token from header (frontend passes it)
const readGoogleRefreshToken = (req) => {
  // header name used by frontend: x-google-refresh-token
  return req.headers["x-google-refresh-token"] || null;
};

// -------------------- Create Event --------------------
export const createEvent = async (req, res) => {
  try {
    const payload = { ...req.body };

    // set createdBy only if req.user exists (depends on your auth)
    if (req.user && req.user.id) payload.createdBy = req.user.id;

    const event = new Event(payload);
    await event.save();

    // enqueue media processing if inputs exist (keeps your current behavior)
    if (event.media?.inputs?.length) {
      await eventQueue.add("processEvent", { eventId: event._id });
    }

    // Calendar sync if frontend passed refresh token header
    const googleRefreshToken = readGoogleRefreshToken(req);
    if (googleRefreshToken) {
      const googleEventId = await createGoogleCalendarEvent(googleRefreshToken, event);
      if (googleEventId) {
        event.googleEventId = googleEventId;
        await event.save();
      }
    }

    return res.status(201).json({ ok: true, event });
  } catch (err) {
    console.error("Create event error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
};

// -------------------- Get Events (list) --------------------
export const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // sort by event_date (your model field)
    const events = await Event.find()
      .sort({ event_date: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Event.countDocuments();

    return res.json({
      ok: true,
      events,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Get events error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
};

// -------------------- Search Events --------------------
export const searchEvents = async (req, res) => {
  try {
    const { q, category, tags, page = 1, limit = 10 } = req.query;
    const query = {};

    if (q) query.event_name = { $regex: q, $options: "i" };
    if (category) query.category = category;
    if (tags) {
      const tagsArray = tags.split(",").map((t) => t.trim());
      query.tags = { $in: tagsArray };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [events, total] = await Promise.all([
      Event.find(query).sort({ event_date: 1 }).skip(skip).limit(Number(limit)),
      Event.countDocuments(query),
    ]);

    return res.json({
      ok: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      events,
    });
  } catch (err) {
    console.error("Search events error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
};

// -------------------- Get by ID --------------------
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });
    return res.json({ ok: true, event });
  } catch (err) {
    console.error("Get event by id error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
};

// -------------------- Update Event --------------------
export const updateEvent = async (req, res) => {
  try {
    const updates = { ...req.body };
    const event = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    if (event.media?.inputs?.length) {
      await eventQueue.add("processEvent", { eventId: event._id });
    }

    // calendar update if refresh token provided in header and we have googleEventId
    const googleRefreshToken = readGoogleRefreshToken(req);
    if (googleRefreshToken && event.googleEventId) {
      await updateGoogleCalendarEvent(googleRefreshToken, event.googleEventId, event);
    }

    return res.json({ ok: true, event });
  } catch (err) {
    console.error("Update event error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
};

// -------------------- Delete Event --------------------
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ ok: false, error: "Event not found" });

    const googleRefreshToken = readGoogleRefreshToken(req);
    if (googleRefreshToken && event.googleEventId) {
      await deleteGoogleCalendarEvent(googleRefreshToken, event.googleEventId);
    }

    await event.deleteOne();
    return res.json({ ok: true, message: "Event deleted" });
  } catch (err) {
    console.error("Delete event error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
};

// -------------------- Sync single event manually (route endpoint) --------------------
// controllers/eventController.js - Update the syncEventToCalendar function
export const syncEventToCalendar = async (req, res) => {
  try {
    // Read refresh token from header (sent by frontend)
    const googleRefreshToken = readGoogleRefreshToken(req);
    
    if (!googleRefreshToken) {
      return res.status(400).json({ 
        ok: false, 
        error: "Google refresh token required. Please reconnect your Google account." 
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ ok: false, error: "Event not found" });
    }

    console.log('Syncing event to calendar:', {
      eventId: event._id,
      eventName: event.event_name,
      hasRefreshToken: !!googleRefreshToken,
      existingGoogleEventId: event.googleEventId
    });

    // 🔹 if already synced → update
    if (event.googleEventId) {
      const success = await updateGoogleCalendarEvent(
        googleRefreshToken,
        event.googleEventId,
        event
      );
      if (!success) {
        return res.status(500).json({ 
          ok: false, 
          error: "Failed to update Google Calendar event. Please check your Google account connection." 
        });
      }
      return res.json({
        ok: true,
        message: "Event updated in your Google Calendar",
        googleEventId: event.googleEventId,
      });
    }

    // 🔹 otherwise create new
    const googleEventId = await createGoogleCalendarEvent(googleRefreshToken, event);
    if (!googleEventId) {
      return res.status(500).json({ 
        ok: false, 
        error: "Failed to create Google Calendar event. Please check your Google account permissions." 
      });
    }

    event.googleEventId = googleEventId;
    await event.save();

    return res.json({
      ok: true,
      message: "Event added to your Google Calendar",
      googleEventId,
    });
  } catch (err) {
    console.error("Sync calendar error:", err?.message || err);
    return res.status(500).json({ 
      ok: false, 
      error: err?.message || "Failed to sync with Google Calendar" 
    });
  }
};