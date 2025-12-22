import mongoose from "mongoose";

// Restructured: Single document per user with nested arrays for each activity type
const userActivitySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    unique: true,
    index: true
  },

  // Each activity type has its own array of unique blog references
  read_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  liked_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  upvoted_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  commented_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  downvoted_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  simplified_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  // Posts created by the user (for badge tracking)
  created_posts: [{
    blog_id: { type: String, required: true },
    count: { type: Number, default: 1 },
    first_activity_date: { type: Date, default: Date.now },
    last_activity_date: { type: Date, default: Date.now }
  }],

  // Aggregate timestamps
  first_activity_date: { type: Date },
  last_activity_date: { type: Date }
}, { timestamps: true });

// Instance method to add activity with automatic deduplication
userActivitySchema.methods.addActivity = function (activityType, blogId) {
  console.log(`🔧 [MODEL] addActivity called: ${activityType}, blog: ${blogId}`);

  const fieldMap = {
    'read': 'read_posts',
    'like': 'liked_posts',
    'upvote': 'upvoted_posts',
    'comment': 'commented_posts',
    'downvote': 'downvoted_posts',
    'simplify': 'simplified_posts',
    'post': 'created_posts'
  };

  const fieldName = fieldMap[activityType];
  if (!fieldName) {
    console.warn(`⚠️ [MODEL] Unknown activity type: ${activityType}`);
    return;
  }

  // Find existing entry
  const existingEntry = this[fieldName].find(entry => entry.blog_id === blogId);

  if (existingEntry) {
    // Update count and date
    console.log(`🔁 [MODEL] Updating existing entry, count: ${existingEntry.count} → ${existingEntry.count + 1}`);
    existingEntry.count += 1;
    existingEntry.last_activity_date = new Date();
  } else {
    // Add new entry
    console.log(`✨ [MODEL] Adding new entry to ${fieldName}`);
    this[fieldName].push({
      blog_id: blogId,
      count: 1,
      first_activity_date: new Date(),
      last_activity_date: new Date()
    });
  }

  // Update aggregate timestamps
  if (!this.first_activity_date) {
    this.first_activity_date = new Date();
  }
  this.last_activity_date = new Date();

  console.log(` [MODEL] Activity added successfully`);
};

// Instance method to remove activity completely (for vote removals)
userActivitySchema.methods.removeActivity = function (activityType, blogId) {
  console.log(`🗑️ [MODEL] removeActivity called: ${activityType}, blog: ${blogId}`);

  const fieldMap = {
    'read': 'read_posts',
    'like': 'liked_posts',
    'upvote': 'upvoted_posts',
    'comment': 'commented_posts',
    'downvote': 'downvoted_posts',
    'simplify': 'simplified_posts',
    'post': 'created_posts'
  };

  const fieldName = fieldMap[activityType];
  if (!fieldName) {
    console.warn(`⚠️ [MODEL] Unknown activity type: ${activityType}`);
    return false;
  }

  // Find index of entry to remove
  const entryIndex = this[fieldName].findIndex(entry => entry.blog_id === blogId);

  if (entryIndex !== -1) {
    // Remove the entire entry (not just decrement count)
    console.log(`🗑️ [MODEL] Removing entry from ${fieldName} at index ${entryIndex}`);
    this[fieldName].splice(entryIndex, 1);
    this.last_activity_date = new Date();
    console.log(`✅ [MODEL] Activity removed successfully`);
    return true;
  } else {
    console.log(`ℹ️ [MODEL] No entry found to remove for ${activityType} on blog ${blogId}`);
    return false;
  }
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
