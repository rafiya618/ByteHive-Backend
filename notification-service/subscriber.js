// subscriber.js
import { io } from "socket.io-client";
import { createRedisClients } from "../shared-config/redisClient.js";
import notificationModel from "./models/notificationModel.js";
import Preference from "./models/preferencesModel.js";
import sendEmail from "./helpers/sendEmail.js";
import notificationCacheModel from "./models/notificationCacheModel.js";
import Subscription from "./models/subscriptionModel.js";
import { sendPush } from "./helpers/push.js";
import { buildNotificationUrl } from "./helpers/buildNotificationUrl.js";
import { updateAggregation } from "./helpers/aggregateNotification.js";
import { cascadeDeletion } from "./helpers/cascadeDeletion.js";
import { notificationCopy } from "./helpers/notificationCopy.js";

const { sub } = await createRedisClients();
const socket = io("http://localhost:4000");

// -----------------------------------------------------
//   DEFAULT PREFERENCES  (push enabled as you requested)
// -----------------------------------------------------
const defaultPrefs = {
  global: { inApp: true, push: true, email: false },
  perType: {
    activities: {
      likePost: { inApp: true, push: true, email: false },
      likeComment: { inApp: true, push: true, email: false },
      comment: { inApp: true, push: true, email: false },
      reply: { inApp: true, push: true, email: false },
      mention: { inApp: true, push: true, email: false }
    },
    network: {
      follow: { inApp: true, push: false, email: false },
      friendRequest: { inApp: true, push: false, email: false },
      connectionAccepted: { inApp: true, push: false, email: false }
    },
    updates: {
      newPost: { inApp: true, push: true, email: false },
      storyUpdate: { inApp: true, push: false, email: false },
      liveStream: { inApp: true, push: false, email: false },
      eventInvite: { inApp: true, push: false, email: false },
      streakReminder: { inApp: true, push: true, email: false } // ← INCLUDED AS REQUESTED
    },
    system: { inApp: false, push: false, email: true },
    security: { inApp: false, push: false, email: true }
  }
};

// -----------------------------------------------------
//   RESOLVE PER-TYPE PREFS
// -----------------------------------------------------
function getPerTypePreference(prefs, triggerType) {
  const mapping = {
    likePost: "activities.likePost",
    likeComment: "activities.likeComment",
    comment: "activities.comment",
    reply: "activities.reply",
    mention: "activities.mention",
    follow: "network.follow",
    friendRequest: "network.friendRequest",
    connectionAccepted: "network.connectionAccepted",
    newPost: "updates.newPost",
    storyUpdate: "updates.storyUpdate",
    liveStream: "updates.liveStream",
    eventInvite: "updates.eventInvite",
    streak_warning: "updates.streakReminder", // ← INCLUDED
    system: "system",
    security: "security",
  };

  const path = mapping[triggerType];

  return (
    path?.split(".").reduce((acc, key) => acc?.[key], prefs.perType) ||
    path?.split(".").reduce((acc, key) => acc?.[key], defaultPrefs.perType) || {
      inApp: true,
      push: false,
      email: false,
    }
  );
}

// -----------------------------------------------------
//   EMAIL BUILDER (uses notificationCopy)
// -----------------------------------------------------
function buildEmailContent(payload) {
  const actor = payload?.meta?.lastActors?.[0] || "Someone";
  const copy = notificationCopy[payload.triggerType];

  const subject = copy?.subject(actor) || "New Notification from ByteHive";
  const headline = copy?.headline(actor) || "You have a new notification";
  const message =
    copy?.body(actor) || payload.message || "Click below to view the notification.";

  const notificationUrl = payload.navigate;

  const body = `
  <div style="background-color:#f9fafb; padding:40px 0; font-family:Arial, Helvetica, sans-serif; color:#333;">
    <div style="max-width:600px; background:#fff; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(90deg, #4F46E5, #3B82F6); padding:20px 30px; color:white; text-align:center;">
        <h1 style="margin:0; font-size:24px;">ByteHive</h1>
      </div>

      <div style="padding:30px;">
        <h2 style="color:#111827; font-size:20px; margin-bottom:10px;">${headline}</h2>
        <p style="font-size:16px; line-height:1.6;">${message}</p>

        <div style="margin-top:25px; text-align:center;">
          <a href="http://localhost:5173${notificationUrl}" 
             style="background:#4F46E5; color:white; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
             View Notification →
          </a>
        </div>
      </div>

      <div style="background-color:#f3f4f6; padding:15px; text-align:center; font-size:12px; color:#6b7280;">
        <p>This is an automated message from <strong>ByteHive</strong>.</p>
        <p>© ${new Date().getFullYear()} ByteHive, All rights reserved.</p>
      </div>
    </div>
  </div>`;
  return { subject, body };
}

// -----------------------------------------------------
//   REDIS: USER CACHE SYNC
// -----------------------------------------------------
await sub.subscribe("userCache:events", async (message) => {
  try {
    const { event, payload } = JSON.parse(message);

    if (event === "userCache:created" || event === "userCache:updated") {
      await notificationCacheModel.findByIdAndUpdate(
        payload.id,
        {
          name: payload.name,
          username: payload.username,
          email: payload.email,
          profileImage: payload.profileImage,
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("❌ Cache update error:", err.message);
  }
});

// -----------------------------------------------------
//   REDIS: NOTIFICATION EVENT
// -----------------------------------------------------
await sub.subscribe("notification:event", async (message) => {
  try {
    const { notificationPayload: payload } = JSON.parse(message);

    if (payload.entityType === "security" || payload.entityType === "system") {
      await sendEmail(payload.receiverEmail, payload.entityType, payload.message);
      return;
    }

    // Avoid notifying self
    if (payload.receiverId === payload.senderId) return;

    // Preferences
    let prefs = await Preference.findOne({ userId: payload.receiverId }) || defaultPrefs;
    const perType = getPerTypePreference(prefs, payload.triggerType);

    const allowedChannels = [];
    if (prefs.global.inApp && perType.inApp) allowedChannels.push("in-app");
    if (prefs.global.push && perType.push) allowedChannels.push("push");
    if (prefs.global.email && perType.email) allowedChannels.push("email");

    if (!allowedChannels.includes("in-app")) allowedChannels.push("in-app");

    const groupKey = `${payload.triggerType}:${payload.entityType}:${payload.entityId}`;

    let existing = await notificationModel.findOne({
      receiverId: payload.receiverId,
      groupKey,
      status: "unread",
    });

    const sender = await notificationCacheModel.findById(payload.senderId);

    // -----------------------------------------------------
    //   UPDATE AGGREGATED NOTIFICATION
    // -----------------------------------------------------
    if (existing) {
      updateAggregation(existing, sender.username, payload.triggerType, "add", payload.triggerId);
      existing.navigate = buildNotificationUrl(existing);
      existing.channels = allowedChannels;

      await existing.save();

      socket.emit("forward:event", {
        type: "notification:update",
        data: existing
      });

      return;
    }

    // -----------------------------------------------------
    //   CREATE NEW NOTIFICATION
    // -----------------------------------------------------
    const meta = {
      count: 1,
      lastActors: [sender.username],
      triggerIds: new Map([[sender.username, [payload.triggerId]]])
    };

    const notificationData = {
      ...payload,
      groupKey,
      channels: allowedChannels,
      meta,
    };

    notificationData.navigate = buildNotificationUrl(notificationData);

    const notification = await notificationModel.create(notificationData);

    socket.emit("forward:event", {
      type: "notification:new",
      data: notification
    });

    // -----------------------------------------------------
    //   PUSH NOTIFICATION
    // -----------------------------------------------------
    if (allowedChannels.includes("push")) {
      const subs = await Subscription.find({ userId: payload.receiverId });

      for (const sub of subs) {
        await sendPush(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: "New Notification",
            body: payload.message,
            url: notificationData.navigate,
            data: payload,
          })
        );
      }
    }

    // -----------------------------------------------------
    //   EMAIL NOTIFICATION
    // -----------------------------------------------------
    if (allowedChannels.includes("email")) {
      const { subject, body } = buildEmailContent(notification);
      const user = await notificationCacheModel.findById(payload.receiverId);
      await sendEmail(user.email, subject, body);
    }

  } catch (err) {
    console.error("❌ Failed to handle notification", err);
  }
});

// -----------------------------------------------------
//   DELETE NOTIFICATION
// -----------------------------------------------------
await sub.subscribe("notification:delete", async (message) => {
  try {
    const { payload } = JSON.parse(message);
    const { receiverId, entityId, triggerType, commentId, entityType } = payload;

    if (payload?.type) {
      cascadeDeletion(payload);
    }

    const groupKey = `${triggerType}:${entityType}:${entityId}`;
    const notif = await notificationModel.findOne({ receiverId, groupKey });

    if (!notif) return;

    let matchedUsername = null;

    for (const [username, trigIds] of notif.meta.triggerIds.entries()) {
      if (Array.isArray(trigIds) && trigIds.includes(commentId)) {
        matchedUsername = username;
        break;
      }
    }

    if (!matchedUsername) return;

    updateAggregation(notif, matchedUsername, notif.triggerType, "remove", commentId);

    if (notif.meta.count <= 0) {
      await notif.deleteOne();
    } else {
      await notif.save();
      socket.emit("forward:event", {
        type: "notification:update",
        data: notif
      });
    }

  } catch (err) {
    console.error("❌ Failed to handle notification deletion:", err.message);
  }
});

// -----------------------------------------------------
//   SYSTEM NOTIFICATIONS
// -----------------------------------------------------
await sub.subscribe("system_notification", async (message) => {
  try {
    const payload = JSON.parse(message);

    if (!payload.receiverId) return;

    const notification = await notificationModel.create({
      receiverId: payload.receiverId,
      senderId: null,
      triggerType: "system",
      entityType: "system",
      entityId: `system-${Date.now()}-${payload.receiverId}`,
      message: payload.message,
      navigate: payload.data?.url || "/notifications",
      channels: ["in-app"],
      status: "unread",
      meta: {
        count: 1,
        lastActors: ["System"],
        triggerIds: new Map()
      }
    });

    socket.emit("forward:event", {
      type: "notification:new",
      data: notification
    });

  } catch (err) {
    console.error("❌ [SYSTEM_NOTIFICATION] Error:", err);
  }
});
