import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

export const queues = {
  postJobs: new Queue("postJobs", { connection: redisConnection }),
  qaJobs: new Queue("qaJobs", { connection: redisConnection })
};

// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";
// import { Queue } from "bullmq";
// import IORedis from "ioredis";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// dotenv.config();

// export const redisConnection = new IORedis({
//   host: process.env.REDIS_HOST,
//   port: Number(process.env.REDIS_PORT || 6379),
//   password: process.env.REDIS_PASSWORD || undefined,
//   maxRetriesPerRequest: null
// });

// export const queues = {
//   postJobs: new Queue("postJobs", { connection: redisConnection }),
//   qaJobs: new Queue("qaJobs", { connection: redisConnection })
// };
