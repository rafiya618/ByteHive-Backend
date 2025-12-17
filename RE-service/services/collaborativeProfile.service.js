// Instruction Notes:
// 2) Batch processing + Summaries: Build collaborative summaries per user (Requirement: generate summaries for collaborative)
//    Captures engaged posts and communities as implicit preferences (candidate generation uses these).
export function buildCollaborativeProfile(logs) {
  const postIds = new Set();
  const communityIds = new Set();

  logs.forEach(l => {
    if (l.entityType === "post") postIds.add(String(l.entityId));
    if (l.entityType === "community") communityIds.add(String(l.entityId));
    // If the log is a post with metadata.community, also treat as community engagement
    if (l.entityType === "post" && l.metadata?.community) {
      communityIds.add(String(l.metadata.community));
    }
  });

  return {
    posts: [...postIds],
    communities: [...communityIds],
  };
}
