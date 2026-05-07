export const notificationCopy = {
  // ===== ACTIVITIES =====
  likePost: {
    subject: (actor) => `${actor} liked your post`,
    headline: (actor) => `${actor} liked your post`,
    body: () => "Your post received new engagement."
  },

  likeComment: {
    subject: (actor) => `${actor} liked your comment`,
    headline: (actor) => `${actor} liked your comment`,
    body: (actor) => `${actor} appreciated your comment.`
  },

  comment: {
    subject: (actor) => `${actor} commented on your post`,
    headline: (actor) => `${actor} commented on your post`,
    body: () => "Open the post to view the latest comment."
  },

  reply: {
    subject: (actor) => `${actor} replied to your comment`,
    headline: (actor) => `${actor} replied to your comment`,
    body: () => "Open the conversation to review the reply."
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
    body: () => "View their profile for more details."
  },

  friendRequest: {
    subject: () => "New friend request",
    headline: (actor) => `${actor} sent you a friend request`,
    body: () => "Review the request and respond when ready."
  },

  connectionAccepted: {
    subject: () => "Connection accepted",
    headline: (actor) => `${actor} accepted your request`,
    body: () => "You are now connected."
  },

  join_request: {
    subject: (actor) => `New join request from ${actor}`,
    headline: (actor) => `${actor} requested to join your community`,
    body: (actor) => `${actor} requested access. Review the request to accept or decline.`
  },

  request_approved: {
    subject: () => "Community join request approved",
    headline: () => "Your request to join has been approved",
    body: () => "You now have access to the community."
  },

  // ===== UPDATES =====
  newPost: {
    subject: (actor) => `${actor} published a new post`,
    headline: (actor) => `${actor} published a new post`,
    body: () => "Open ByteHive to read the latest update."
  },

  storyUpdate: {
    subject: () => "New story update",
    headline: () => "A new story was posted",
    body: () => "Open ByteHive to view the latest story."
  },

  liveStream: {
    subject: () => "Live stream started",
    headline: () => "A live stream is happening now",
    body: () => "Join now to watch the live session."
  },

  eventInvite: {
    subject: () => "You're invited to an event",
    headline: () => "New event invitation",
    body: () => "Review the event details and respond when convenient."
  },

  // ===== SYSTEM & SECURITY =====
  system: {
    subject: () => "Important announcement from ByteHive",
    headline: () => "Platform announcement",
    body: () => "Please review this announcement for the latest update."
  },

  security: {
    subject: () => "Security alert",
    headline: () => "Important security notice",
    body: () => "Please review this activity and secure your account if needed."
  }
};