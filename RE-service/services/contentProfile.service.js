// Instruction Notes:
// 2) Batch processing + Summaries: Build content summaries per user (Requirement: generate summaries for content)
//    We weight interactions by type and aggregate tag weights.
export function buildContentProfile(logs) {
  const weights = { read: 1, comment: 2, upvote: 3, share: 2.5, join: 0 };
  const tagWeights = {};

  logs.forEach(l => {
    const w = weights[l.action] ?? 1;
    const tags = Array.isArray(l.metadata?.tags) ? l.metadata.tags : [];
    tags.forEach(t => {
      const key = String(t).trim().toLowerCase();
      if (!key) return;
      tagWeights[key] = (tagWeights[key] || 0) + w;
    });
  });

  // Optional normalization
  const total = Object.values(tagWeights).reduce((a, b) => a + b, 0) || 1;
  const normalized = Object.fromEntries(
    Object.entries(tagWeights).map(([k, v]) => [k, Number((v / total).toFixed(6))])
  );

  return normalized; // persisted as tagWeights
}
