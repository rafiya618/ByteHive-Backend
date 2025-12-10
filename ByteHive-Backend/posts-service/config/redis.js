import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

export const queues = {
  postJobs: new Queue("postJobs", { connection: redisConnection })
};
