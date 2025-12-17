// Instruction Notes:
// 3) Trending computation: derive trending posts and communities from logs (Requirement: do not use views field; use logs)
//    We apply action weights and time decay; return separate maps for posts and communities.
export function scoreLogsByEntity(logs) {
  const weights = { read: 1, comment: 2, upvote: 3, share: 2.5, join: 1.5 };
  const now = Date.now();

  const posts = new Map();
  const communities = new Map();

  for (const l of logs) {
    const actionW = weights[l.action] ?? 1;
    const ageHours = Math.max(1, (now - new Date(l.timestamp).getTime()) / 36e5);
    const decay = 1 / Math.sqrt(ageHours); // gentle decay favouring recent
    const score = actionW * decay;

    if (l.entityType === "post") {
      posts.set(l.entityId, (posts.get(l.entityId) || 0) + score);
      // Also attribute to community if provided
      const cid = l.metadata?.community;
      if (cid) communities.set(cid, (communities.get(cid) || 0) + score * 0.5);
    } else if (l.entityType === "community") {
      communities.set(l.entityId, (communities.get(l.entityId) || 0) + score);
    }
  }

  return { posts, communities };
}
