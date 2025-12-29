export const notificationCopy = {
  // ===== ACTIVITIES =====
  likePost: {
    subject: (actor) => `${actor} liked your post`,
    headline: (actor) => `${actor} liked your post`,
    body: () => "Your post is getting attention 🎉"
  },

  likeComment: {
    subject: (actor) => `${actor} liked your comment`,
    headline: (actor) => `${actor} liked your comment`,
    body: (actor) => `${actor} appreciated your comment.`
  },

  comment: {
    subject: (actor) => `${actor} commented on your post`,
    headline: (actor) => `${actor} commented on your post`,
    body: () => "Join the conversation by viewing the comment."
  },

  reply: {
    subject: (actor) => `${actor} replied to your comment`,
    headline: (actor) => `${actor} replied to your comment`,
    body: () => "Click below to view the reply."
  },

  mention: {
    subject: (actor) => `${actor} mentioned you`,
    headline: (actor) => `${actor} mentioned you`,
    body: () => "You were mentioned in a conversation."
  },

  // ===== NETWORK =====
  follow: {
    subject: (actor) => `${actor} started following you`,
    headline: (actor) => `${actor} started following you`,
    body: () => "Check out their profile."
  },

  friendRequest: {
    subject: (actor) => "New friend request",
    headline: (actor) => `${actor} sent you a friend request`,
    body: () => "Respond to the request."
  },

  connectionAccepted: {
    subject: () => "Connection accepted",
    headline: (actor) => `${actor} accepted your request`,
    body: () => "You are now connected."
  },

  join_request: {
    subject: (actor) => `New join request from ${actor}`,
    headline: (actor) => `${actor} requested to join your community`,
    body: (actor) => `${actor} wants to join. Review the request to accept or decline.`
  },

  request_approved: {
    subject: (actor) => "Community join request approved",
    headline: (actor) => "Your request to join has been approved",
    body: (actor) => "You are now a member of the community."
  },

  // ===== UPDATES =====
  newPost: {
    subject: () => "New post from your network",
    headline: () => "Someone shared a new post",
    body: () => "Check out what’s new."
  },

  storyUpdate: {
    subject: () => "New story update",
    headline: () => "A new story was posted",
    body: () => "View the latest story."
  },

  liveStream: {
    subject: () => "Live stream started",
    headline: () => "A live stream is happening now",
    body: () => "Join before it ends."
  },

  eventInvite: {
    subject: () => "You're invited to an event",
    headline: () => "New event invitation",
    body: () => "See event details."
  },

  // ===== SYSTEM & SECURITY =====
  system: {
    subject: () => "System notification from ByteHive",
    headline: () => "System update",
    body: () => "Please review the system message."
  },

  security: {
    subject: () => "Security alert",
    headline: () => "Important security notice",
    body: () => "If this wasn’t you, take action immediately."
  }
};