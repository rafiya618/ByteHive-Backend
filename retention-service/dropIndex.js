import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the problematic index
    const collection = mongoose.connection.collection('streaks');
    await collection.dropIndex('badge_details.badge_id_1').catch(err => {
      if (err.code === 27) {
        console.log('⚠️  Index does not exist, that\'s okay');
      } else {
        throw err;
      }
    });
    console.log('✅ Dropped problematic index: badge_details.badge_id_1');

    // List remaining indexes
    const indexes = await collection.getIndexes();
    console.log('📊 Remaining indexes:', Object.keys(indexes));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

connectDB();
