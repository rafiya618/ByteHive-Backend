import { Queue } from "bullmq";
import IORedis from "ioredis";

function buildRedisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;

  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  }

  return `redis://${host}:${port}`;
}

const redisUrl = buildRedisUrl();

export const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const queues = {
  postJobs: new Queue("postJobs", { connection: redisConnection }),
  qaJobs: new Queue("qaJobs", { connection: redisConnection })
};

export async function createRedisClients() {
  try {
    const pub = redisConnection.duplicate();
    const sub = redisConnection.duplicate();

    // Attach error handlers to avoid unhandled error events
    const attachHandlers = (c, name) => {
      if (!c || typeof c.on !== "function") return;
      c.on("error", (err) => console.error(`[Redis ${name}]`, err && err.message ? err.message : err));
    };
    attachHandlers(pub, "pub");
    attachHandlers(sub, "sub");

    // ioredis may connect automatically; only call connect() if client isn't already connecting/ready.
    const safeConnect = async (c) => {
      if (!c || typeof c.connect !== "function") return;
      const status = c.status;
      if (status === "connecting" || status === "ready") return;
      try {
        await c.connect();
      } catch (e) {
        // If already connecting in parallel, ignore that specific error
        if (e && String(e.message).includes("already connecting")) return;
        throw e;
      }
    };

    await Promise.all([safeConnect(pub), safeConnect(sub)]);

    return { pub, sub, isFallback: false };
  } catch (err) {
    console.error("[Redis] Failed to create pub/sub clients:", err?.message || err);
    const noop = async () => {};
    return {
      pub: { publish: async () => 0, quit: noop, disconnect: noop, on: () => {} },
      sub: { subscribe: async () => {}, unsubscribe: async () => {}, quit: noop, disconnect: noop, on: () => {} },
      isFallback: true,
    };
  }
}
