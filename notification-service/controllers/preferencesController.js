import Preferences from "../models/preferencesModel.js";
import { createRedisClients } from "../../shared-config/redisClient.js";

// Lazy init for publisher
let redisPub;
const getRedisPub = async () => {
  if (!redisPub) {
    const clients = await createRedisClients();
    redisPub = clients.pub;
  }
  return redisPub;
};

const userFacingTypes = ["comment", "reply", "mention", "like", "follow", "message"];

export const getPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    let prefs = await Preferences.findOne({ userId });

    if (!prefs) {
      prefs = await Preferences.create({ userId });
    }

    // Strip hidden types before sending to UI
    const cleaned = prefs.toObject();
    ["push", "email", "sms"].forEach((ch) => {
      if (cleaned[ch] && cleaned[ch].types) {
        const filtered = {};
        userFacingTypes.forEach((t) => {
          filtered[t] = cleaned[ch].types[t];
        });
        cleaned[ch].types = filtered;
      }
    });

    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ error: "Failed to load preferences" });
  }
};

export const updatePreferences = async (req, res) => {
  console.log('\n📥 [PREFERENCES CONTROLLER] ==================== REQUEST RECEIVED ====================');
  console.log('👤 [PREFERENCES CONTROLLER] User ID from params:', req.params.userId);
  console.log('📦 [PREFERENCES CONTROLLER] Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { userId } = req.params;
    const updates = req.body;

    // Import models for state management
    const NotificationSchedule = (await import("../models/NotificationScheduleModel.js")).default;
    const NotificationStateHistory = (await import("../models/NotificationStateHistoryModel.js")).default;

    // Fetch existing preferences
    let prefs = await Preferences.findOne({ userId });
    if (!prefs) {
      prefs = await Preferences.create({ userId });
    }

    // Handle streakReminder toggle separately for state management
    if (updates.streakReminder !== undefined) {
      const isEnabled = updates.streakReminder;
      const previousState = prefs.perType?.updates?.streakReminder?.enabled ?? (typeof prefs.streakReminder === 'boolean' ? prefs.streakReminder : true);

      // Only process if state actually changed
      if (isEnabled !== previousState) {
        // MIGRATION: If streakReminder is currently a boolean, unset it first
        if (typeof prefs.streakReminder === 'boolean') {
          console.log('🔄 [MIGRATION] Converting root boolean streakReminder to object structure');
          await Preferences.updateOne(
            { userId },
            { $unset: { 'streakReminder': '' } }
          );
        }
        if (typeof prefs.perType?.updates?.streakReminder === 'boolean') {
          console.log('🔄 [MIGRATION] Converting boolean streakReminder to object structure');
          await Preferences.updateOne(
            { userId },
            { $unset: { 'perType.updates.streakReminder': '' } }
          );
        }

        // Update preference with nested object structure
        const updatePath = {
          'perType.updates.streakReminder.enabled': isEnabled,
          'perType.updates.streakReminder.lastModified': new Date()
        };

        // Update preferences
        prefs = await Preferences.findOneAndUpdate(
          { userId },
          { $set: updatePath },
          { new: true, upsert: true }
        );

        // Create state history record for audit trail
        await NotificationStateHistory.create({
          userId,
          action: isEnabled ? 'enabled' : 'disabled',
          notificationType: 'streakReminder',
          timestamp: new Date(),
          metadata: {
            source: 'streak_dropdown',
            previousState
          }
        });

        // Manage notification schedule
        if (isEnabled) {
          // Create or activate schedule
          const schedule = await NotificationSchedule.findOneAndUpdate(
            { userId, notificationType: 'streak_warning' },
            {
              $set: {
                status: 'active',
                scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
              }
            },
            { upsert: true, new: true }
          );

          // Link schedule to preference
          await Preferences.findOneAndUpdate(
            { userId },
            { $set: { 'perType.updates.streakReminder.scheduleId': schedule._id.toString() } }
          );
        } else {
          // Cancel existing schedule
          await NotificationSchedule.updateMany(
            { userId, notificationType: 'streak_warning', status: 'active' },
            { $set: { status: 'cancelled' } }
          );
        }

        // Publish system notification
        const message = isEnabled
          ? "🔥 Streak reminders enabled! We'll keep you posted."
          : "🔕 Streak reminders disabled. You won't receive warnings.";

        console.log("\n📢 [PREFERENCES] ==================== PUBLISHING SYSTEM NOTIFICATION ====================");
        console.log(`👤 [PREFERENCES] User: ${userId}`);
        console.log(`⚙️  [PREFERENCES] Action: ${isEnabled ? 'ENABLED' : 'DISABLED'} streak reminders`);
        console.log(`💬 [PREFERENCES] Message: "${message}"`);

        const payload = {
          type: "system",
          userId: userId,
          receiverId: userId,
          triggerType: "system",
          entityType: "system",
          message: message,
          data: {
            url: "/notifications",
            timestamp: new Date().toISOString(),
            action: isEnabled ? 'enabled' : 'disabled'
          }
        };

        console.log("📦 [PREFERENCES] Payload:", JSON.stringify(payload, null, 2));

        const pub = await getRedisPub();
        console.log("🔗 [PREFERENCES] Redis publisher obtained");

        await pub.publish("system_notification", JSON.stringify(payload));
        console.log("✅ [PREFERENCES] Published to Redis channel: system_notification");
        console.log("📢 [PREFERENCES] ==================== END PUBLISH ====================\n");
      }
    }

    // Handle other preference updates
    const otherUpdates = { ...updates };
    delete otherUpdates.streakReminder;

    if (Object.keys(otherUpdates).length > 0) {
      prefs = await Preferences.findOneAndUpdate(
        { userId },
        { $set: otherUpdates },
        { new: true, upsert: true }
      );
    }

    res.json(prefs);
  } catch (err) {
    console.error("Update preferences error:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
};
