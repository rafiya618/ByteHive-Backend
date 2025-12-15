import cron from "node-cron";
import Streak from "./models/streakModel.js";
import { createRedisClients } from "../shared-config/redisClient.js";
import { hasActivityToday } from "./helpers/retentionHelper.js";

let pub;

const initScheduler = async () => {
    try {
        const clients = await createRedisClients();
        pub = clients.pub;

        console.log("⏰ Streak Scheduler Initialized");

        // Schedule: Check every hour
        cron.schedule("0 * * * *", async () => {
            console.log("⏳ Running Streak Expiry Check...");
            await checkExpiringStreaks();
        });

    } catch (err) {
        console.error("Failed to init scheduler:", err);
    }
};

const checkExpiringStreaks = async () => {
    try {
        const now = new Date();
        // Look for streaks expiring in the next 4 hours
        const warningWindow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        const expiringStreaks = await Streak.find({
            streak_expires_at: {
                $gt: now,
                $lte: warningWindow
            }
        });

        console.log(`🔍 Found ${expiringStreaks.length} streaks expiring soon.`);

        // Import models for preference and schedule checking
        const { default: Preference } = await import('../notification-service/models/preferencesModel.js');
        const { default: NotificationSchedule } = await import('../notification-service/models/NotificationScheduleModel.js');

        for (const streak of expiringStreaks) {
            // Double check they haven't done anything today
            if (hasActivityToday(streak.last_activity_date)) {
                continue;
            }

            // ✅ Check notification preferences
            const prefs = await Preference.findOne({ userId: streak.user_id });
            const isEnabled = prefs?.perType?.updates?.streakReminder?.enabled ?? true;

            if (!isEnabled) {
                console.log(`⏭️ Skipping user ${streak.user_id} - streak reminders disabled`);
                continue;
            }

            // ✅ Check if we already sent a warning today (idempotency)
            const dateKey = now.toISOString().split('T')[0];
            const triggerId = `streak-warning-${streak.user_id}-${dateKey}`;

            const existingSchedule = await NotificationSchedule.findOne({
                userId: streak.user_id,
                notificationType: 'streak_warning',
                status: 'completed',
                lastExecutedAt: {
                    $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
                }
            });

            if (existingSchedule) {
                console.log(`⏭️ Already sent warning to user ${streak.user_id} today`);
                continue;
            }

            // ✅ Send warning notification
            const payload = {
                triggerType: "streak_warning",
                receiverId: streak.user_id,
                senderId: streak.user_id,
                entityType: "system",
                entityId: triggerId,
                triggerId: triggerId,
                message: "🔥 Your streak is about to expire! Read a post now to keep it alive!",
                navigate: "/streak"
            };

            if (pub) {
                await pub.publish("notification:event", JSON.stringify({ notificationPayload: payload }));
                console.log(`📨 Sent streak warning to user ${streak.user_id}`);
            }

            // ✅ Record execution in NotificationSchedule
            await NotificationSchedule.findOneAndUpdate(
                { userId: streak.user_id, notificationType: 'streak_warning' },
                {
                    $set: {
                        status: 'completed',
                        lastExecutedAt: now
                    }
                },
                { upsert: true }
            );
        }

    } catch (err) {
        console.error("Error checking streaks:", err);
    }
}

export default initScheduler;
