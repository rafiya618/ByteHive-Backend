import { createRedisClients } from "../config/redisClient.js";
import Announcement from "../models/Announcement.js";
import UserDirectory from "../models/UserDirectory.js";

const { pub } = await createRedisClients();

function buildAnnouncementMessage(announcement) {
  return `${announcement.title}\n\n${announcement.message}`.trim();
}

async function getRecipients(audience = "all_active") {
  const query = audience === "all_users" ? {} : { status: "active" };

  return UserDirectory.find(query)
    .select("_id email username name status")
    .lean();
}

async function publishSystemNotification({ receiverId, receiverEmail, message, announcementId }) {
  const notificationPayload = {
    receiverId: receiverId?.toString(),
    receiverEmail: receiverEmail || "",
    senderId: "admin-system",
    triggerType: "system",
    triggerId: `announcement-${announcementId}-${receiverId}`,
    entityType: "system",
    entityId: `announcement-${announcementId}`,
    message,
    navigate: `/system/announcement/${announcementId}`,
    forceChannels: ["in-app", "push", "email"],
    data: {
      url: `/system/announcement/${announcementId}`,
      announcementId: announcementId?.toString()
    }
  };

  await pub.publish("notification:event", JSON.stringify({ notificationPayload }));

  return notificationPayload;
}

export async function deliverAnnouncement(announcement) {
  const recipients = await getRecipients(announcement.audience);
  const totalRecipients = recipients.length;

  await Announcement.findByIdAndUpdate(announcement._id, {
    status: "sending",
    deliverySummary: {
      totalRecipients,
      delivered: 0,
      failed: 0,
      lastRunAt: new Date(),
      error: ""
    }
  });

  let delivered = 0;
  let failed = 0;
  const message = buildAnnouncementMessage(announcement);

  for (const recipient of recipients) {
    try {
      await publishSystemNotification({
        receiverId: recipient._id,
        receiverEmail: recipient.email,
        message,
        announcementId: announcement._id
      });
      delivered += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[ANNOUNCEMENT] Failed to deliver to ${recipient._id}:`, err.message);
    }
  }

  const nextStatus = failed > 0 && delivered === 0 ? "failed" : "sent";

  await Announcement.findByIdAndUpdate(announcement._id, {
    status: nextStatus,
    sentAt: new Date(),
    deliverySummary: {
      totalRecipients,
      delivered,
      failed,
      lastRunAt: new Date(),
      error: failed > 0 && delivered === 0 ? "All deliveries failed" : ""
    }
  });

  return { totalRecipients, delivered, failed, status: nextStatus };
}

export async function processDueAnnouncements() {
  const now = new Date();
  const dueAnnouncements = await Announcement.find({
    status: "scheduled",
    $or: [{ scheduledFor: null }, { scheduledFor: { $lte: now } }]
  }).sort({ scheduledFor: 1, createdAt: 1 });

  const results = [];
  for (const announcement of dueAnnouncements) {
    try {
      const result = await deliverAnnouncement(announcement);
      results.push({ announcementId: announcement._id.toString(), ...result });
      console.log(`[ANNOUNCEMENT] Delivered ${announcement._id} to ${result.delivered}/${result.totalRecipients}`);
    } catch (err) {
      await Announcement.findByIdAndUpdate(announcement._id, {
        status: "failed",
        deliverySummary: {
          totalRecipients: 0,
          delivered: 0,
          failed: 0,
          lastRunAt: new Date(),
          error: err.message
        }
      });

      console.error(`[ANNOUNCEMENT] Failed to deliver ${announcement._id}:`, err.message);
      results.push({ announcementId: announcement._id.toString(), error: err.message });
    }
  }

  return results;
}

export function startAnnouncementScheduler() {
  const tick = async () => {
    try {
      await processDueAnnouncements();
    } catch (err) {
      console.error("[ANNOUNCEMENT] Scheduler tick failed:", err.message);
    }
  };

  tick();
  return setInterval(tick, 60 * 1000);
}