import dotenv from "dotenv";
dotenv.config();

import { Worker, QueueEvents } from "bullmq";
import { redisConnection } from "../config/redis.js";
import cloudinary from "../config/cloudinary.js";
import "../db/mongoose.js"; // connect Mongo for worker
import Post from "../models/Post.js";
import { calcReadTime } from "../helpers/readTime.js";

const queueName = "postJobs";
const concurrency = 5;

const uploadOne = async (input) => {
  // input can be base64 or remote URL; detect automatically
  const res = await cloudinary.uploader.upload(input, {
    folder: "posts",
    resource_type: "auto"
  });
  return {
    url: res.secure_url,
    public_id: res.public_id,
    type: res.resource_type === "video" ? "video" : "image"
  };
};

const processor = async (job) => {
  const { postId } = job.data;
  const post = await Post.findById(postId);
  if (!post) return { skipped: true, reason: "Post not found" };

  // 1) Upload media if any
  let changed = false;
  const assets = post.media?.assets || [];
  if (post.media?.inputs?.length) {
    const uploaded = [];
    for (const input of post.media.inputs) {
      try {
        const asset = await uploadOne(input);
        uploaded.push(asset);
      } catch (err) {
        console.error("[Worker] Upload error:", err.message);
      }
    }
    // Merge unique by public_id
    const existing = new Set(assets.map(a => a.public_id));
    for (const a of uploaded) if (!existing.has(a.public_id)) assets.push(a);

    post.media.assets = assets;
    post.media.inputs = []; // clear processed
    changed = true;

    if (!post.thumbnail && assets[0]?.url) {
      post.thumbnail = assets[0].url;
    }
  }

  // 2) Calculate read_time
  const newRead = calcReadTime(post.post_description || "");
  if (post.read_time !== newRead) {
    post.read_time = newRead;
    changed = true;
  }

  // 3) Mark ready
  if (post.status !== "ready") {
    post.status = "ready";
    changed = true;
  }

  if (changed) await post.save();
  return { postId, assets: post.media.assets.length, read_time: post.read_time };
};

// run worker
const worker = new Worker(queueName, processor, {
  connection: redisConnection,
  concurrency
});

const events = new QueueEvents(queueName, { connection: redisConnection });
events.on("completed", ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed`, returnvalue);
});
events.on("failed", ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);
});
