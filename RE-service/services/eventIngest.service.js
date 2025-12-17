// Instruction Notes:
// 1) Event logging API: receives events and persists logs (Requirement: store user's events in logs)
//    If a post event lacks tags, we enrich metadata.tags from the Post document to power content summaries.
import InteractionLog from "../models/InteractionLog.js";
import { getPostTagsById, getPostLiteById } from "./helpers/postLookup.js";

/**
 * Logs a user interaction event.
 * @param {Object} event - event object
 * @param {string} event.userId - user performing the action
 * @param {string} event.entityType - "post" or "community"
 * @param {string} event.entityId - postId or communityId
 * @param {string} event.action - "read", "upvote", "comment", "join", "share"
 * @param {Object} [event.metadata] - optional metadata (tags, timeSpentSec, etc.)
 */
export async function logEvent(event) {
  try {
    const payload = {
      userId: String(event.userId),
      entityType: event.entityType,
      entityId: String(event.entityId),
      action: event.action,
      metadata: event.metadata || {},
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    };

    // Enrich post logs with tags if missing to improve content profiles
    if (payload.entityType === "post") {
      // Fill tags if missing and attach community id for downstream signals (via Posts service API)
      const lite = await getPostLiteById(payload.entityId);
      if (lite) {
        if (!Array.isArray(payload.metadata.tags) || payload.metadata.tags.length === 0) {
          payload.metadata.tags = lite.tags || [];
        }
        if (lite.community && !payload.metadata.community) {
          payload.metadata.community = lite.community;
        }
      } else if (!payload.metadata?.tags) {
        const tags = await getPostTagsById(payload.entityId);
        if (Array.isArray(tags) && tags.length) payload.metadata.tags = tags;
      }
    }

    const log = await InteractionLog.create(payload);
    return log;
  } catch (err) {
    console.error("Error logging event:", err);
    throw err;
  }
}
