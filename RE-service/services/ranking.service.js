// Instruction Notes:
// 4) Ranking & Candidate Generation:
//    - Combine content (tag) match, collaborative (communities/posts), trending, and freshness.
//    - Exclude context like region/day/night as requested.
//    - Provide Feed Recommendations and Most Recent based on user interest (Requirement 1 and 3).
import UserContentProfile from "../models/UserContentProfile.js";
import UserCollaborativeProfile from "../models/UserCollaborativeProfile.js";
import TrendingPost from "../models/TrendingPost.js";
import TrendingCommunity from "../models/TrendingCommunity.js";
import { getCandidatesByFilters } from "./helpers/postLookup.js";
import InteractionLog from "../models/InteractionLog.js";

function scorePost({ post, tagWeights, communitySet, trendingMap }) {
  const tagMatch = (post.tags || []).reduce((s, t) => s + (tagWeights[t?.toLowerCase()] || 0), 0);
  const inCommunity = communitySet.has(post.community) ? 1 : 0;
  const trend = trendingMap.get(String(post._id)) || 0;
  const ageHours = Math.max(1, (Date.now() - new Date(post.createdAt || post.date || Date.now()).getTime()) / 36e5);
  const freshness = 1 / Math.sqrt(ageHours);

  // Weights tuned for developer platform
  const score = 0.6 * tagMatch + 0.25 * inCommunity + 0.1 * trend + 0.05 * freshness;
  return Number(score.toFixed(6));
}

export async function generateFeed(userId, { limit = 50 } = {}) {
  const [content, collab, trendingPosts, trendingCommunities, seenLogs] = await Promise.all([
    UserContentProfile.findOne({ userId }).lean(),
    UserCollaborativeProfile.findOne({ userId }).lean(),
    TrendingPost.find().sort({ score: -1 }).limit(200).lean(),
    TrendingCommunity.find().sort({ score: -1 }).limit(50).lean(),
    InteractionLog.find({ userId, entityType: "post" }).select({ entityId: 1 }).lean(),
  ]);

  const tagWeights = content?.tagWeights || {};
  const communitySet = new Set(collab?.communities || []);
  const trendingMap = new Map(trendingPosts.map(tp => [tp.postId, tp.score]));

  // Candidate generation
  const topTags = Object.entries(tagWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);

  const seenPostIds = new Set(seenLogs.map(l => String(l.entityId)));

  // Loosely-coupled: fetch candidates from Posts service
  const candidates = await getCandidatesByFilters({ tags: topTags, communities: [...communitySet], limit: 500 });

  // Score and rank
  const scored = candidates
    .filter(post => !seenPostIds.has(String(post._id))) // Rule: de-prioritize content already interacted with
    .map(post => ({ post, score: scorePost({ post, tagWeights, communitySet, trendingMap }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Most Recent based on user interest (tags/communities) sorted by time
  const recentInterest = candidates
    .filter(p => (p.tags || []).some(t => topTags.includes(String(t).toLowerCase())) || communitySet.has(p.community))
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .slice(0, Math.min(30, limit));

  return {
    recommended: {
      posts: scored.map(({ post, score }) => ({ ...post, score })),
    },
    trending: {
      posts: trendingPosts.slice(0, 20),
      communities: trendingCommunities.slice(0, 20),
    },
    recent: {
      posts: recentInterest,
    },
  };
}

