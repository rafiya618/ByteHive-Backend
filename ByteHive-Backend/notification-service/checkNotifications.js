/**
 * Check Notifications in Database
 * Queries the notifications collection to see what's stored
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://momina:WFbQgzM54N4G4yqT@cluster0.iuqggh8.mongodb.net/bytehive?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '6937c7431561722e3c05fcb0';

async function checkNotifications() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas\n');

        const db = client.db('bytehive');

        // Check notifications for this user
        console.log('📊 Notifications for user:', USER_ID);
        console.log('─'.repeat(60));

        const notifications = await db.collection('notifications')
            .find({ receiverId: USER_ID })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        console.log(`Total notifications: ${notifications.length}\n`);

        if (notifications.length === 0) {
            console.log('❌ No notifications found for this user!');
            console.log('\nLet\'s check if ANY notifications exist:');
            const anyNotifs = await db.collection('notifications').find({}).limit(5).toArray();
            console.log(`Total notifications in DB: ${await db.collection('notifications').countDocuments()}`);
            if (anyNotifs.length > 0) {
                console.log('\nSample notification structure:');
                console.log(JSON.stringify(anyNotifs[0], null, 2));
            }
        } else {
            notifications.forEach((notif, idx) => {
                console.log(`${idx + 1}. Type: ${notif.triggerType}`);
                console.log(`   Message: ${notif.message}`);
                console.log(`   Status: ${notif.status}`);
                console.log(`   Created: ${notif.createdAt}`);
                console.log(`   Receiver: ${notif.receiverId} (type: ${typeof notif.receiverId})`);
                console.log();
            });
        }

        // Check notification preferences
        console.log('\n📋 Checking preferences:');
        const prefs = await db.collection('preferences').findOne({ userId: USER_ID });
        if (prefs) {
            console.log('Preferences found:');
            console.log(`  streakReminder:`, prefs.perType?.updates?.streakReminder);
        } else {
            console.log('❌ No preferences found for this user!');
        }

        // Check notification state history
        console.log('\n📜 Notification State History:');
        const history = await db.collection('notificationstatehistories')
            .find({ userId: USER_ID })
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        if (history.length > 0) {
            history.forEach((h, i) => {
                console.log(`${i + 1}. ${h.action} - ${h.notificationType} at ${h.timestamp}`);
            });
        } else {
            console.log('  No history found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

checkNotifications();
