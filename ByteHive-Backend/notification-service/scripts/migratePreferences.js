/**
 * Migration Script: Update Preferences for Nested StreakReminder
 * 
 * This script migrates existing preferences from old boolean structure to new nested object.
 * Run this once after deploying the new preference model changes.
 * 
 * Usage: node migratePreferences.js
 */

import mongoose from 'mongoose';
import Preference from '../models/preferencesModel.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bytehive';

async function migratePreferences() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all preferences with old boolean streakReminder structure
        const count = await Preference.countDocuments({
            streakReminder: { $type: 'bool' }
        });

        console.log(`📊 Found ${count} preferences to migrate`);

        if (count === 0) {
            console.log('✅ No migration needed - all preferences are up to date');
            await mongoose.disconnect();
            return;
        }

        // Migrate in batches
        const batchSize = 100;
        let migrated = 0;

        while (migrated < count) {
            const batch = await Preference.find({
                streakReminder: { $type: 'bool' }
            }).limit(batchSize);

            for (const pref of batch) {
                const oldValue = pref.streakReminder ?? true;

                // Update to nested structure
                await Preference.updateOne(
                    { _id: pref._id },
                    {
                        $set: {
                            'perType.updates.streakReminder': {
                                enabled: oldValue,
                                lastModified: new Date(),
                                scheduleId: null
                            }
                        },
                        $unset: {
                            streakReminder: ''
                        }
                    }
                );

                migrated++;
            }

            console.log(`📝 Migrated ${migrated}/${count} preferences`);
        }

        console.log('✅ Migration completed successfully');
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migratePreferences();
