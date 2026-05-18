import { createRedisClients } from "./config/redis.js";
import Post from "./models/Post.js";

const { sub } = await createRedisClients();

await sub.subscribe("userCache:events", async (message) => {
  try {
    const { event, payload } = JSON.parse(message || "{}");
    if (event !== "userCache:updated") return;

    const userId = payload?.id ? String(payload.id) : "";
    if (!userId) return;

    const nextUsername = payload?.username || "";
    if (!nextUsername) return;

    const result = await Post.updateMany(
      { user_id: userId },
      { $set: { author_username: nextUsername } }
    );

    if (result?.matchedCount) {
      console.log(
        `[posts-service] Synced author_username for user ${userId} in ${result.modifiedCount} posts`
      );
    }
  } catch (err) {
    console.error("[posts-service] userCache subscriber error:", err.message);
  }
});
