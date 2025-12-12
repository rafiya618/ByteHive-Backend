import { Worker, QueueEvents } from "bullmq";
import { redisConnection } from "../config/redis.js";
import cloudinary from "../config/cloudinary.js";
import Event from "../models/Event.js";
import "../db/mongoose.js"; // Mongo connection

const queueName = "eventJobs";
const concurrency = 3;

const uploadOne = async (input) => {
  const res = await cloudinary.uploader.upload(input, {
    folder: "events",
    resource_type: "auto",
  });
  return {
    url: res.secure_url,
    public_id: res.public_id,
    type: res.resource_type === "video" ? "video" : "image",
  };
};

const processor = async (job) => {
  const { eventId } = job.data;
  const event = await Event.findById(eventId);
  if (!event) return { skipped: true };

  let changed = false;
  const assets = event.media?.assets || [];

  if (event.media?.inputs?.length) {
    const uploaded = [];
    for (const input of event.media.inputs) {
      try {
        const asset = await uploadOne(input);
        uploaded.push(asset);
      } catch (err) {
        console.error("[EventWorker] Upload error:", err.message);
      }
    }

    const existing = new Set(assets.map((a) => a.public_id));
    for (const a of uploaded) if (!existing.has(a.public_id)) assets.push(a);

    event.media.assets = assets;
    event.media.inputs = [];
    changed = true;

    if (!event.thumbnail && assets[0]?.url) {
      event.thumbnail = assets[0].url;
    }
  }

  if (event.status !== "ready") {
    event.status = "ready";
    changed = true;
  }

  if (changed) await event.save();
  return { eventId, assets: event.media.assets.length };
};

const worker = new Worker(queueName, processor, {
  connection: redisConnection,
  concurrency,
});

const events = new QueueEvents(queueName, { connection: redisConnection });
events.on("completed", ({ jobId, returnvalue }) => {
  console.log(`✅ Event job ${jobId} completed`, returnvalue);
});
events.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ Event job ${jobId} failed: ${failedReason}`);
});
