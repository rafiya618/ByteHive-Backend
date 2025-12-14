/**
 * Test System Notification Creation
 * Simulates toggling streak reminder to test notification creation
 */

import { MongoClient } from 'mongodb';
import axios from 'axios';

const MONGODB_URI = 'mongodb+srv://momina:WFbQgzM54N4G4yqT@cluster0.iuqggh8.mongodb.net/bytehive?retryWrites=true&w=majority&appName=Cluster0';
const USER_ID = '6937c7431561722e3c05fcb0';
const NOTIFICATION_API = 'http://localhost:3002';

async function testNotificationFlow() {
    console.log('🧪 Testing Notification Flow\n');

    // Step 1: Check current notifications
    console.log('1️⃣  Checking current notifications in database...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('bytehive');

    const beforeCount = await db.collection('notifications').countDocuments({ receiverId: USER_ID });
    console.log(`   Current count: ${beforeCount}\n`);

    // Step 2: Try to fetch from API
    console.log('2️⃣  Fetching from API...');
    try {
        const response = await axios.get(`${NOTIFICATION_API}/notifications/${USER_ID}`);
        console.log(`   ✅ API Response:`, response.data);
        console.log(`   Notifications returned: ${response.data.notifications?.length || 0}\n`);
    } catch (error) {
        console.log(`   ❌ API Error: ${error.message}\n`);
    }

    // Step 3: Check notification subscriber status
    console.log('3️⃣  Checking Redis subscriber status...');
    const redisStatus = await db.collection('notificationschedules').find().limit(5).toArray();
    console.log(`   NotificationSchedules: ${redisStatus.length} records\n`);

    // Step 4: Manually insert a test notification
    console.log('4️⃣  Creating a test notification manually...');
    const testNotification = {
        receiverId: USER_ID,
        senderId: 'system',
        triggerType: 'system',
        message: 'Test notification - Streak reminder enabled',
        entityType: 'system',
        entityId: null,
        navigate: '/retention',
        channels: ['in_app'],
        status: 'sent',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const insertResult = await db.collection('notifications').insertOne(testNotification);
    console.log(`   ✅ Test notification created: ${insertResult.insertedId}\n`);

    // Step 5: Verify it was created
    const afterCount = await db.collection('notifications').countDocuments({ receiverId: USER_ID });
    console.log(`5️⃣  After test:  ${afterCount} notifications (added ${afterCount - beforeCount})\n`);

    // Step 6: Try fetching again
    console.log('6️⃣  Fetching again from API...');
    try {
        const response2 = await axios.get(`${NOTIFICATION_API}/notifications/${USER_ID}`);
        console.log(`   ✅ Notifications now: ${response2.data.notifications?.length || 0}`);
        if (response2.data.notifications?.length > 0) {
            console.log(`   Latest: "${response2.data.notifications[0].message}"`);
        }
    } catch (error) {
        console.log(`   ❌ API Error: ${error.message}`);
    }

    await client.close();
    console.log('\n✅ Test complete!');
}

testNotificationFlow();
