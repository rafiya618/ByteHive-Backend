const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Post = require('../models/Post');
const SavedPost = require('../models/SavedPost');
const ViewHistory = require('../models/ViewHistory');

// Sample posts data
const samplePosts = [
  {
    title: "Building Modern Web Applications with Next.js and TypeScript",
    content: "Learn how to leverage the power of Next.js and TypeScript to create robust, type-safe web applications with excellent developer experience.",
    author: "David Lee",
    category: "Next.js Devs",
    tags: ["Next.js", "TypeScript", "WebDevelopment"]
  },
  {
    title: "Advanced React Patterns and Performance Optimization",
    content: "Explore advanced React patterns, hooks optimization, and performance techniques to build lightning-fast applications.",
    author: "Sarah Chen",
    category: "React Developers",
    tags: ["React", "Performance", "Hooks"]
  },
  {
    title: "Building Scalable APIs with Node.js and Express",
    content: "Learn how to design and implement scalable REST APIs using Node.js, Express, and modern development practices.",
    author: "Michael Rodriguez",
    category: "Full Stack",
    tags: ["Node.js", "Express", "API"]
  },
  {
    title: "Modern DevOps Practices with Docker and Kubernetes",
    content: "Master containerization and orchestration with Docker and Kubernetes for scalable application deployment.",
    author: "Emily Davis",
    category: "DevOps",
    tags: ["Docker", "Kubernetes", "DevOps"]
  },
  {
    title: "Understanding GraphQL: A Complete Guide",
    content: "Comprehensive guide to GraphQL, covering queries, mutations, subscriptions, and best practices for modern API development.",
    author: "Alex Johnson",
    category: "GraphQL",
    tags: ["GraphQL", "API", "Backend"]
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Post.deleteMany({});
    await SavedPost.deleteMany({});
    await ViewHistory.deleteMany({});

    console.log('Cleared existing data...');

    // Insert sample posts
    const createdPosts = await Post.insertMany(samplePosts);
    console.log(`Created ${createdPosts.length} sample posts`);

    // Create some sample user data
    const userId = 'user_test_123';
    
    // Add some posts to saved items - FIXED: Insert one by one to avoid duplicate key errors
    try {
      const savedPost1 = new SavedPost({
        userId,
        postId: createdPosts[0]._id,
        category: 'Saved'
      });
      await savedPost1.save();

      const savedPost2 = new SavedPost({
        userId,
        postId: createdPosts[1]._id,
        category: 'Watch Later'
      });
      await savedPost2.save();

      const savedPost3 = new SavedPost({
        userId,
        postId: createdPosts[2]._id,
        category: 'Saved'
      });
      await savedPost3.save();

      console.log('Created 3 sample saved posts');
    } catch (error) {
      console.log('Error creating saved posts:', error.message);
    }

    // Add some view history - FIXED: Insert one by one
    try {
      const viewHistory1 = new ViewHistory({
        userId,
        postId: createdPosts[0]._id,
        viewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      });
      await viewHistory1.save();

      const viewHistory2 = new ViewHistory({
        userId,
        postId: createdPosts[3]._id,
        viewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });
      await viewHistory2.save();

      const viewHistory3 = new ViewHistory({
        userId,
        postId: createdPosts[4]._id,
        viewedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      });
      await viewHistory3.save();

      console.log('Created 3 sample view history entries');
    } catch (error) {
      console.log('Error creating view history:', error.message);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Sample Data Created:');
    console.log(`  - Posts: ${createdPosts.length}`);
    console.log(`  - Saved Posts: 3`);
    console.log(`  - View History: 3`);
    console.log(`\n🆔 Test User ID: ${userId}`);
    console.log('\n💡 You can use this user ID for testing the frontend');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the seeding script
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;