// Instruction Notes:
// 3) Batch job: compute trending posts and communities using logs only (Requirement: Trending Posts and Trending Communities)
import InteractionLog from "../models/InteractionLog.js";
import TrendingPost from "../models/TrendingPost.js";
import TrendingCommunity from "../models/TrendingCommunity.js";
import { scoreLogsByEntity } from "../services/trending.service.js";

export async function computeTrending({ lookbackHours = 72 } = {}) {
  const since = new Date(Date.now() - lookbackHours * 36e5);
  const logs = await InteractionLog.find({ timestamp: { $gte: since } }).lean();
  const { posts, communities } = scoreLogsByEntity(logs);

  await TrendingPost.deleteMany({});
  await TrendingCommunity.deleteMany({});

  const postDocs = [...posts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .map(([postId, score]) => ({ postId, score: Number(score.toFixed(6)) }));
  if (postDocs.length) await TrendingPost.insertMany(postDocs);

  const communityDocs = [...communities.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .map(([communityId, score]) => ({ communityId, score: Number(score.toFixed(6)) }));
  if (communityDocs.length) await TrendingCommunity.insertMany(communityDocs);
}
