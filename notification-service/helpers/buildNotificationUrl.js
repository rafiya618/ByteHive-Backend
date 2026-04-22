export function buildNotificationUrl(notification) {
  const isAggregated = (notification.meta?.count ?? 1) > 1;

  // ✅ Extract a triggerId from Map
  let triggerId = null;
  if (notification.meta?.triggerIds instanceof Map) {
    //  console.log('entered in map')
    // Get first entry in the Map
    for (const [_, ids] of notification.meta.triggerIds.entries()) {
      if (Array.isArray(ids) && ids.length > 0) {
        triggerId = ids[0]; // ✅ first triggerId
        break;
      }
    }
  } else if (notification.meta?.triggerIds) {
    console.log('entered in obejct')
    // If it's accidentally stored as plain object
    const firstKey = Object.keys(notification.meta.triggerIds)[0];
    triggerId = notification.meta.triggerIds[firstKey]?.[0];
    console.log('yes its object')
  }

  switch (notification.triggerType) {
    case "post":
      return `/post/${notification.entityId}`;

    case "likePost":
      return `/post/${notification.entityId}`;

    case "comment":
      return `/post/${notification.postId}?triggerId=${triggerId}&isAggregated=${isAggregated}`;

    case "reply":
      return `/post/${notification.postId}?triggerId=${triggerId}&isAggregated=${isAggregated}`;

    case "likeComment":
      return `/post/${notification.postId}?triggerId=${triggerId}&isAggregated=${isAggregated}`;

    case "newPost":
      return `/post/${notification.postId || notification.entityId}`;

    case "profile":
      return `/profile/${notification.entityId}`;

    case "system":
      return `/system/${notification.entityId || ""}`;

    case "security":
      return `/security/${notification.entityId || ""}`;

    case "admin_action":
      return "/notifications";

    case "join_request":
      return `/community/${notification.entityId || notification.communityId}`;

    case "request_approved":
      return `/community/${notification.entityId || notification.communityId}`;

    default:
      return "/"; // fallback
  }
}