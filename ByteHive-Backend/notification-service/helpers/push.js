// helpers/push.js
import webPush from "web-push";
import subscriptionModel from "../models/subscriptionModel.js";

// Configure VAPID keys
webPush.setVapidDetails(
  "mailto:example@yourdomain.org",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendPush(subscription, payload) {
  try {
    await webPush.sendNotification(subscription, payload);
    console.log("✅ Push sent to:", subscription.endpoint);
  } catch (err) {
    console.error("❌ Push error:", err.statusCode, err.body);

    // Handle expired or invalid subscription
    if (err.statusCode === 410 || err.statusCode === 404) {
      try {
        await subscriptionModel.deleteOne({ endpoint: subscription.endpoint });
        console.log("🗑️ Removed expired subscription:", subscription.endpoint);
      } catch (dbErr) {
        console.error("❌ Failed to remove expired subscription:", dbErr);
      }
    }
  }
}
