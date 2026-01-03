import { createRedisClients } from "../shared-config/redisClient.js";
import DashboardStats from "./models/DashboardStats.js";

const { sub } = await createRedisClients();

const EVENT_MAP = {
  user_created: { totalUsers: 1 },
  user_deleted: { totalUsers: -1 },

  post_created: { totalPosts: 1 },
  post_deleted: { totalPosts: -1 },

  community_created: { totalCommunities: 1 },
  community_deleted: { totalCommunities: -1 },

};

await sub.subscribe("dashboard:stats", async (message) => {
  try {
    const parsed = JSON.parse(message);
    const { type } = parsed;

    const delta = EVENT_MAP[type];
    if (!delta) return; // ignore unknown events

    await DashboardStats.findOneAndUpdate(
      {},
      { $inc: delta },
      { upsert: true }
    );

    console.log(`✅ Dashboard stats updated: ${type}`);
  } catch (error) {
    console.error("❌ Dashboard stats update failed:", error.message);
  }
});


