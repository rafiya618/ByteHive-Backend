const SavedPost = require('../models/SavedPost');
const Post = require('../models/Post');
const mongoose = require('mongoose');

// Save a post
exports.savePost = async (req, res) => {
  try {
    console.log('Save post request:', req.body); // Debug log
    
    const { userId, postId, category = 'Saved', title, content, author, tags = [] } = req.body;

    if (!userId || !postId) {
      return res.status(400).json({ error: 'userId and postId are required' });
    }

    // Better ObjectId handling - try to use existing ID or create new one
    let objectId;
    const postIdStr = String(postId);
    
    if (mongoose.Types.ObjectId.isValid(postIdStr) && postIdStr.length === 24) {
      objectId = new mongoose.Types.ObjectId(postIdStr);
    } else {
      // Create consistent ObjectId from string ID
      const hash = postIdStr.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hexString = Math.abs(hash).toString(16).padStart(24, '0').substring(0, 24);
      objectId = new mongoose.Types.ObjectId(hexString);
    }

    console.log('Processing post with ID:', postIdStr, '-> ObjectId:', objectId);

    // Check if post exists or create it
    let post = await Post.findById(objectId);
    if (!post) {
      post = new Post({
        _id: objectId,
        title: title || 'Untitled Post',
        content: content || 'No content provided',
        author: author || 'Anonymous',
        category: 'General',
        tags: Array.isArray(tags) ? tags : []
      });
      await post.save();
      console.log('Created new post:', post._id);
    }

    //  Check if already saved in ANY category and update/replace
    const existingSave = await SavedPost.findOne({ userId, postId: objectId });
    if (existingSave) {
      // Update category if different (move between Saved and Watch Later)
      if (existingSave.category !== category) {
        existingSave.category = category;
        existingSave.savedAt = new Date();
        existingSave.reminderSent = false;
        await existingSave.save();
        await existingSave.populate('postId');
        return res.json({ 
          message: `Post moved to ${category} successfully`, 
          savedPost: existingSave 
        });
      }
      return res.status(409).json({ error: `Post already saved in ${category}` });
    }

    // Create new saved post
    const savedPost = new SavedPost({
      userId,
      postId: objectId,
      category
    });

    await savedPost.save();
    await savedPost.populate('postId');

    console.log('Post saved successfully:', savedPost._id);
    res.status(201).json({ message: `Post saved to ${category} successfully`, savedPost });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

//  Get user's saved posts with proper "All Items" logic
exports.getSavedPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, page = 1, limit = 10 } = req.query;

    console.log('Get saved posts for user:', userId, 'category:', category);

    const query = { userId };
    
    // FIXED: Handle category filtering properly
    if (category && category !== 'All Items' && category !== 'all') {
      // Handle "Read Later" -> "Watch Later" mapping
      const actualCategory = category === 'Read Later' ? 'Watch Later' : category;
      query.category = actualCategory;
    }
    // If category is 'All Items' or null, don't add category filter (get all)

    const skip = (page - 1) * limit;

    const savedPosts = await SavedPost.find(query)
      .populate('postId')
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SavedPost.countDocuments(query);

    console.log(`Found ${savedPosts.length} saved posts for user ${userId} in category ${category || 'All Items'}`);

    res.json({
      savedPosts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + savedPosts.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Remove saved post with better ID matching
exports.removeSavedPost = async (req, res) => {
  try {
    const { userId, postId } = req.params;
    
    console.log('Remove saved post - userId:', userId, 'postId:', postId);

    // Try multiple ID matching strategies
    const postIdStr = String(postId);
    let savedPost = null;

    // Strategy 1: Direct ObjectId match if valid
    if (mongoose.Types.ObjectId.isValid(postIdStr) && postIdStr.length === 24) {
      const objectId = new mongoose.Types.ObjectId(postIdStr);
      savedPost = await SavedPost.findOneAndDelete({ userId, postId: objectId });
      console.log('Tried ObjectId match:', objectId, 'Result:', savedPost ? 'Found' : 'Not found');
    }

    // Strategy 2: Create ObjectId from string hash (same logic as save)
    if (!savedPost) {
      const hash = postIdStr.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hexString = Math.abs(hash).toString(16).padStart(24, '0').substring(0, 24);
      const hashedObjectId = new mongoose.Types.ObjectId(hexString);
      savedPost = await SavedPost.findOneAndDelete({ userId, postId: hashedObjectId });
      console.log('Tried hashed ObjectId match:', hashedObjectId, 'Result:', savedPost ? 'Found' : 'Not found');
    }

    // Strategy 3: Search through all user's saved posts to find matching original ID
    if (!savedPost) {
      const allSavedPosts = await SavedPost.find({ userId }).populate('postId');
      console.log(`Searching through ${allSavedPosts.length} saved posts for ID: ${postIdStr}`);
      
      for (const saved of allSavedPosts) {
        // Check if the original post ID matches (stored in our system)
        if (saved.postId && String(saved.postId._id) === postIdStr) {
          savedPost = await SavedPost.findByIdAndDelete(saved._id);
          console.log('Found match by post._id:', saved.postId._id);
          break;
        }
      }
    }

    if (!savedPost) {
      console.log('No saved post found with ID:', postIdStr);
      return res.status(404).json({ error: 'Saved post not found' });
    }

    console.log('Successfully removed saved post:', savedPost._id);
    res.json({ message: 'Post removed from saved items successfully' });
  } catch (error) {
    console.error('Error removing saved post:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Get saved posts by category
exports.getSavedPostsByCategory = async (req, res) => {
  try {
    const { userId, category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    //  Handle "All Items" category properly
    let query = { userId };
    if (category !== 'All Items' && category !== 'all') {
      query.category = category;
    }

    const savedPosts = await SavedPost.find(query)
      .populate('postId')
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SavedPost.countDocuments(query);

    res.json({
      savedPosts,
      category,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + savedPosts.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching saved posts by category:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};