
import { createClient } from "redis";

async function testPub() {
    const pub = createClient({ url: "redis://localhost:6379" });
    await pub.connect();
    console.log("Connected to Redis");

    const notificationPayload = {
        receiverId: "694c19ace3507dd81259f3a6", // Replace with a real userId for testing if needed
        senderId: "test-sender",
        triggerType: 'join_request',
        entityType: 'community',
        entityId: "test-community",
        triggerId: `test-${Date.now()}`,
        message: `TEST requested to join AICommunity`,
        navigate: `/notifications`
    };

    console.log("Publishing test notification...");
    await pub.publish("notification:event", JSON.stringify({ notificationPayload }));
    console.log("Published!");

    await pub.disconnect();
}

testPub().catch(console.error);
