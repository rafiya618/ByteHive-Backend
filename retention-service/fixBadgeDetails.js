/**
 * Fix Badge Details Script
 * 
 * This script rebuilds badge_details from badges_earned for users who have
 * badges in badges_earned but empty badge_details array.
 * 
 * Run: node fixBadgeDetails.js
 */

import mongoose from 'mongoose';
import Streak from './models/streakModel.js';
import { BADGE_DEFINITIONS } from './helpers/retentionHelper.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bytehive';

async function fixBadgeDetails() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all streaks where badges_earned has items but badge_details is empty
        const streaks = await Streak.find({
            $and: [
                { badges_earned: { $exists: true, $ne: [] } },
                {
                    $or: [
                        { badge_details: { $exists: false } },
                        { badge_details: { $size: 0 } }
                    ]
                }
            ]
        });

        console.log(`📊 Found ${streaks.length} streaks with missing badge_details`);

        for (const streak of streaks) {
            console.log(`\n🔧 Fixing user: ${streak.user_id}`);
            console.log(`  Current badges_earned:`, streak.badges_earned);
            console.log(`  Current badge_details:`, streak.badge_details);

            // Rebuild badge_details from badges_earned
            const newBadgeDetails = [];
            for (const badgeId of streak.badges_earned) {
                const badgeDef = BADGE_DEFINITIONS.find(b => b.badge_id === badgeId);
                if (badgeDef) {
                    newBadgeDetails.push({
                        ...badgeDef,
                        earned_at: streak.createdAt || new Date() // Use creation date or now
                    });
                    console.log(`  ✅ Rebuilt: ${badgeDef.badge_name}`);
                } else {
                    console.log(`  ⚠️  Badge not found in definitions: ${badgeId}`);
                }
            }

            // Update the streak
            streak.badge_details = newBadgeDetails;
            await streak.save();
            console.log(`  💾 Saved ${newBadgeDetails.length} badge details`);
        }

        console.log('\n✅ Badge details fix completed!');
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
}

fixBadgeDetails();
