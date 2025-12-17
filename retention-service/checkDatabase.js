/**
 * Direct MongoDB Atlas Query
 * Connects to your MongoDB Atlas and shows what's actually stored
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://rafiamalik787:DXeBg0sPDCEStAhQ@bytehive.xqmy3.mongodb.net/?retryWrites=true&w=majority&appName=ByteHive';

async function checkDatabase() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas\n');

        const db = client.db('bytehive');

        // List all collections
        console.log('📚 Collections in bytehive database:');
        const collections = await db.listCollections().toArray();
        for (const coll of collections) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(`   - ${coll.name}: ${count} documents`);
        }

        // Check streaks collection specifically
        console.log('\n🔍 Checking streaks collection:');
        const streaksCount = await db.collection('streaks').countDocuments();
        console.log(`   Total: ${streaksCount} documents`);

        if (streaksCount > 0) {
            console.log('\n📊 Sample streak documents:');
            const samples = await db.collection('streaks').find({}).limit(3).toArray();
            samples.forEach((doc, idx) => {
                console.log(`\n   Document ${idx + 1}:`);
                console.log(`   user_id: ${doc.user_id} (type: ${typeof doc.user_id})`);
                console.log(`   total_reads: ${doc.total_reads}`);
                console.log(`   badges_earned: ${doc.badges_earned?.length || 0}`);
                console.log(`   badge_details: ${doc.badge_details?.length || 0}`);
            });
        }

        // Try to search for the specific user
        console.log('\n🎯 Searching for user: 6937c7431561722e3c05fcb0');
        const userStreak = await db.collection('streaks').findOne({
            user_id: '6937c7431561722e3c05fcb0'
        });
        if (userStreak) {
            console.log('   ✅ Found!');
            console.log('   Reads:', userStreak.total_reads);
            console.log('   Badges:', userStreak.badges_earned);
            console.log('   Badge details:', userStreak.badge_details?.length || 0);
        } else {
            console.log('   ❌ Not found with string');

            // Try as ObjectId
            const { ObjectId } = await import('mongodb');
            try {
                const userStreakObj = await db.collection('streaks').findOne({
                    user_id: new ObjectId('6937c7431561722e3c05fcb0')
                });
                if (userStreakObj) {
                    console.log('   ✅ Found with ObjectId!');
                } else {
                    console.log('   ❌ Also not found with ObjectId');
                }
            } catch (e) {
                console.log('   ⚠️  Invalid ObjectId format');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

checkDatabase();
