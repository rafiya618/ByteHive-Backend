/**
 * Simple Notification Test - Create & Check
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://momina:WFbQgzM54N4G4yqT@cluster0.iuqggh8.mongodb.net/bytehive?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '6937c7431561722e3c05fcb0';

async function createTestNotification() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB\n');

        const db = client.db('bytehive');

        // Check current count
        const beforeCount = await db.collection('notifications').countDocuments({ receiverId: USER_ID });
        console.log(`📊 Current notifications: ${beforeCount}\n`);

        // Create test notification
        console.log('✨ Creating test notification...');
        const testNotif = {
            receiverId: USER_ID,
            senderId: 'system',
            triggerType: 'system',
            message: '🔔 Test Notification: Streak reminders have been enabled!',
            entityType: 'system',
            entityId: null,
            navigate: '/retention',
            channels: ['in_app'],
            status: 'sent',
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('notifications').insertOne(testNotif);
        console.log(`✅ Created notification: ${result.insertedId}\n`);

        // Verify
        const afterCount = await db.collection('notifications').countDocuments({ receiverId: USER_ID });
        console.log(`📊 After creation: ${afterCount} notifications\n`);

        // Show the notification
        const notification = await db.collection('notifications').findOne({ _id: result.insertedId });
        console.log('📝 Notification details:');
        console.log(`   Message: ${notification.message}`);
        console.log(`   Type: ${notification.triggerType}`);
        console.log(`   isRead: ${notification.isRead}`);
        console.log(`   Created: ${notification.createdAt}`);

        console.log('\n✅ Test complete! Refresh your notification page to see it.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

createTestNotification();
