/**
 * Find User Streak - Try Different Formats
 */

import mongoose from 'mongoose';
import Streak from './models/streakModel.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bytehive';
const USER_ID_STRING = '6937c7431561722e3c05fcb0';

async function findStreak() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Try as string
        console.log('1️⃣  Searching with string:', USER_ID_STRING);
        let streak = await Streak.findOne({ user_id: USER_ID_STRING });
        if (streak) {
            console.log('   ✅ Found!');
            displayStreak(streak);
        } else {
            console.log('   ❌ Not found');
        }

        // Try as ObjectId
        console.log('\n2️⃣  Searching with ObjectId');
        streak = await Streak.findOne({ user_id: new mongoose.Types.ObjectId(USER_ID_STRING) });
        if (streak) {
            console.log('   ✅ Found!');
            displayStreak(streak);
        } else {
            console.log('   ❌ Not found');
        }

        // List all streaks to see what's in the database
        console.log('\n3️⃣  Listing all streaks:');
        const allStreaks = await Streak.find({}).limit(5);
        console.log(`   Total streaks in DB: ${await Streak.countDocuments()}`);
        allStreaks.forEach((s, idx) => {
            console.log(`   ${idx + 1}. user_id: ${s.user_id} (type: ${typeof s.user_id})`);
            console.log(`      badges_earned: ${s.badges_earned.length}, badge_details: ${s.badge_details?.length || 0}`);
        });

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function displayStreak(streak) {
    console.log('\n📊 Streak Data:');
    console.log('   user_id:', streak.user_id, `(type: ${typeof streak.user_id})`);
    console.log('   Reads:', streak.total_reads);
    console.log('   Posts:', streak.total_posts);
    console.log('   badges_earned:', streak.badges_earned);
    console.log('   badge_details:', streak.badge_details?.length || 0, 'items');
    if (streak.badge_details && streak.badge_details.length > 0) {
        streak.badge_details.forEach((b, i) => {
            console.log(`      ${i + 1}. ${b.badge_name}`);
        });
    }
}

findStreak();
