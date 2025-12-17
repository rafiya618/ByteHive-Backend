// Instruction Notes:
// - Scheduler to run batch jobs periodically (profiles + trending)
import cron from "node-cron";
import { buildProfiles } from "./buildProfiles.job.js";
import { computeTrending } from "./computeTrending.job.js";

export function startScheduler() {
  // Build profiles every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    try {
      await buildProfiles();
      // eslint-disable-next-line no-console
      console.log("[RE-service] Profiles rebuilt (cron)");
    } catch (e) {
      console.error("[RE-service] Profiles job failed", e);
    }
  });

  // Compute trending every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      await computeTrending();
      console.log("[RE-service] Trending recomputed (cron)");
    } catch (e) {
      console.error("[RE-service] Trending job failed", e);
    }
  });
}
