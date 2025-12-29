// helpers/aggregateNotification.js

import { buildNotificationUrl } from "./buildNotificationUrl.js";

/**
 * Joins actors into a natural-sounding string.
 * e.g., ["Alice"] → "Alice"
 *       ["Alice", "Bob"] → "Alice and Bob"
 *       ["Alice", "Bob", "Charlie"] → "Alice, Bob, and Charlie"
 *       ["Alice", "Bob", "Charlie", "Dan"] → "Alice, Bob, Charlie, and others"
 */
function formatActorList(actors, totalCount) {
    if (!actors || actors.length === 0) return "Someone";
    const displayedCount = actors.length;
    const moreCount = totalCount - displayedCount;

    if (displayedCount === 1) {
        return actors[0] || "Someone";
    } else if (displayedCount === 2) {
        return `${actors[0]} and ${actors[1]}`;
    } else if (displayedCount === 3) {
        return `${actors[0]}, ${actors[1]}, and ${actors[2]}`;
    } else {
        return `${actors.slice(0, 3).join(", ")}, and others`;
    }
}

/**
 * Builds a human-readable aggregated message.
 */
export function buildAggregatedMessage(triggerType, actors, totalCount, notification) {
    const actorText = formatActorList(actors, totalCount);
    // Be extra protective: if actorText is empty or "Someone", don't add @
    let actorName = "Someone";
    if (actorText && actorText !== "Someone") {
        actorName = `**@${actorText}**`;
    }

    const commName = notification?.communityName ? `**${notification.communityName}**` : "your community";

    switch (triggerType) {
        case "reply":
            return `${actorName} replied to your comment${totalCount > 1 ? ` (${totalCount} replies)` : ""}`;

        case "comment":
            return `${actorName} commented on your post${totalCount > 1 ? ` (${totalCount} comments)` : ""}`;

        case "likeComment":
            return `${actorName} liked your comment`;

        case "likePost":
            return `${actorName} liked your post`;

        case "mention":
            return `${actorName} mentioned you`;

        case "join_request":
            return `${actorName} requested to join ${commName}${totalCount > 1 ? ` (${totalCount} requests)` : ""}`;

        case "request_approved":
            return `${actorName} approved your request to join ${commName}`;

        case "community_follow":
            return `${actorName} started following your community ${commName}`;

        case "follow":
            return `${actorName} started following you`;

        default:
            return `${actorName} did ${triggerType}${totalCount > 1 ? ` (${totalCount} times)` : ""}`;
    }
}


/**
 * Updates the notification aggregation object in-place.
 */
export function updateAggregation(notification, senderUsername, triggerType, action = "add", triggerId) {
    let actors = Array.isArray(notification.meta.lastActors)
        ? [...notification.meta.lastActors]
        : [];

    let count = notification.meta.count || 0;

    // ✅ Always a Map (from schema)
    let triggerIds = notification.meta.triggerIds;

    if (!(triggerIds instanceof Map)) {
        triggerIds = new Map(Object.entries(triggerIds || {}));
    }

    if (action === "add" && triggerId) {
        let arr = triggerIds.get(senderUsername) || [];
        if (!arr.includes(triggerId)) {
            arr.push(triggerId);
            triggerIds.set(senderUsername, arr);
            count++;
        }
        if (!actors.includes(senderUsername)) {
            actors.push(senderUsername);
        }
    }

    if (action === "remove" && triggerId) {
        let arr = triggerIds.get(senderUsername) || [];
        console.log('arr in remove aggragation', arr)
        if (arr.includes(triggerId)) {
            arr = arr.filter((id) => id !== triggerId);
            if (arr.length === 0) {
                triggerIds.delete(senderUsername);
                actors = actors.filter((u) => u !== senderUsername);
            } else {
                triggerIds.set(senderUsername, arr);
            }
            count = Math.max(0, count - 1);
        }
    }

    // keep only last 3 actors for readability
    if (actors.length > 4) {
        actors = actors.slice(-4);
    }


    // update notification meta
    notification.meta.lastActors = actors;
    notification.meta.count = count;
    notification.meta.triggerIds = triggerIds;

    if (actors.length == 1) {
        notification.navigate = buildNotificationUrl(notification);
        console.log('notification.navigate in aggragation', notification.navigate)
    }

    // rebuild message
    notification.message = buildAggregatedMessage(triggerType, actors, count, notification);
    notification.updatedAt = new Date();

    return notification;
}
