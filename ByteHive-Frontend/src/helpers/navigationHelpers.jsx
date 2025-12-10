// utils/navigationHelpers.js
export function navigateFromNotification(n, navigate) {
  const isAggregated = (n.meta?.count ?? 1) > 1;

  if (isAggregated) {
    switch (n.triggerType) {
      case "comment":
        navigate(`/comment`, {
          state: { triggerType: "comment", triggerId: n.triggerId, entityId: n.entityId },
        });
        break;

      case "reply":
        navigate(`/comment`, {
          state: { triggerType: "reply", triggerId: n.entityId, entityId: n.entityId, isAggregation: true },
        });
        break;

      default:
        navigate(`/`);
    }
  } else {
    switch (n.triggerType) {
      case "post":
        navigate(`/posts/${n.entityId}`, {
          state: { triggerType: "post", triggerId: n.triggerId, entityId: n.entityId },
        });
        break;

      case "comment":
      case "like":
      case "reply":
        navigate(`/comment`, {
          state: { triggerType: n.triggerType, triggerId: n.triggerId, entityId: n.entityId },
        });
        break;

      case "profile":
        navigate(`/profile/${n.entityId}`, {
          state: { triggerType: "profile", triggerId: n.triggerId, entityId: n.entityId },
        });
        break;

      default:
        navigate(`/`);
    }
  }
}
