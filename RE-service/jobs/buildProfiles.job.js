// Instruction Notes:
// 2) Batch processing: Build per-user content and collaborative summaries from logs
import InteractionLog from "../models/InteractionLog.js";
import UserContentProfile from "../models/UserContentProfile.js";
import UserCollaborativeProfile from "../models/UserCollaborativeProfile.js";
import { buildContentProfile } from "../services/contentProfile.service.js";
import { buildCollaborativeProfile } from "../services/collaborativeProfile.service.js";

export async function buildProfiles({ lookbackDays = 180 } = {}) {
  const since = new Date(Date.now() - lookbackDays * 24 * 36e5);
  const logs = await InteractionLog.find({ timestamp: { $gte: since } }).lean();

  const byUser = {};
  logs.forEach(l => {
    byUser[l.userId] ||= [];
    byUser[l.userId].push(l);
  });

  for (const userId in byUser) {
    await UserContentProfile.findOneAndUpdate(
      { userId },
      { tagWeights: buildContentProfile(byUser[userId]), updatedAt: new Date() },
      { upsert: true, new: true }
    );

    await UserCollaborativeProfile.findOneAndUpdate(
      { userId },
      buildCollaborativeProfile(byUser[userId]),
      { upsert: true, new: true }
    );
  }
}
