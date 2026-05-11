import { createRedisClients } from "./config/redisClient.js";
import Community from "./models/Community.js";

const { sub } = await createRedisClients();

await sub.subscribe("userCache:events", async (message) => {
  try {
    const { event, payload } = JSON.parse(message || "{}");
    if (event !== "userCache:updated") return;

    const userId = payload?.id ? String(payload.id) : "";
    if (!userId) return;

    const nextUsername = payload?.username || "";
    if (!nextUsername) return;

    const result = await Community.updateMany(
      { user_id: userId },
      { $set: { owner_username: nextUsername } }
    );

    if (result?.matchedCount) {
      console.log(
        `[community-service] Synced owner_username for user ${userId} in ${result.modifiedCount} communities`
      );
    }
  } catch (err) {
    console.error("[community-service] userCache subscriber error:", err.message);
  }
});
