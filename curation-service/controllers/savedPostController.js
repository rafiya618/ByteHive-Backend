import SavedPost from '../models/savedPost.js';
import axios from 'axios';

const POSTS_SERVICE_URL = process.env.POSTS_SERVICE_URL || 'http://localhost:5000/api';

// Helper function to fetch post details from posts service
const fetchPostDetails = async (postId) => {
  try {
    console.log(`Fetching post details for: ${postId}`);
    const response = await axios.get(`${POSTS_SERVICE_URL}/posts/${postId}`);
    console.log(`Post ${postId} response:`, response.data);
    
    // Handle different response formats from posts service
    const postData = response.data?.post || response.data?.data || response.data;
    console.log(`Extracted post data for ${postId}:`, postData);
    return postData;
  } catch (error) {
    console.error(`Error fetching post ${postId}:`, error.message);
    return null;
  }
};
const savePost = async (req, res) => {
  try {
    const { postId, category, userId } = req.body;
    console.log('SavePost request:', { postId, category, userId });

    if (!userId || !postId) {
      return res.status(400).json({ message: 'userId and postId are required' });
    }

    const existingSave = await SavedPost.findOne({ userId, postId });

    if (existingSave) {
      // If already saved and user wants to unsave
      if (!category) {
        await SavedPost.deleteOne({ _id: existingSave._id });
        return res.json({ message: 'Post unsaved successfully' });
      }
      // If already saved and user wants to change category
      existingSave.category = category;
      await existingSave.save();
      return res.json({ message: 'Post category updated successfully' });
    }

    // Create new saved post
    const savedPost = new SavedPost({
      userId,
      postId,
      category: category || 'Saved'
    });

    await savedPost.save();
    console.log('Post saved successfully:', savedPost);
    res.status(201).json({ message: 'Post saved successfully', savedPost });
  } catch (error) {
    console.error('SavePost error:', error);
    res.status(500).json({ message: 'Error saving post', error: error.message });
  }
};

// Get all saved posts for a user
const getSavedPosts = async (req, res) => {
  try {
    const { category, userId } = req.query;
    console.log('getSavedPosts request:', { category, userId });

    const query = { userId };
    if (category) {
      query.category = category;
    }

    const savedPosts = await SavedPost.find(query)
      .sort({ savedAt: -1 });
    
    console.log(`Found ${savedPosts.length} saved posts for user ${userId}`);

    // Fetch full post details for each saved post
    const postsWithDetails = await Promise.all(
      savedPosts.map(async (savedPost) => {
        const postDetails = await fetchPostDetails(savedPost.postId);
        const result = {
          ...savedPost.toObject(),
          postDetails: postDetails || {} // Include actual post data
        };
        console.log(`Returning saved post ${savedPost.postId}:`, result);
        return result;
      })
    );

    console.log('Sending response with posts:', postsWithDetails);
    res.json(postsWithDetails);
  } catch (error) {
    console.error('getSavedPosts error:', error);
    res.status(500).json({ message: 'Error fetching saved posts', error: error.message });
  }
};

// Search within saved posts
const searchSavedPosts = async (req, res) => {
  try {
    const { searchTerm, category, userId } = req.query;

    const query = { userId };
    if (category) {
      query.category = category;
    }

    // Fetch all saved posts first
    const savedPosts = await SavedPost.find(query)
      .sort({ savedAt: -1 });

    // Fetch post details and filter by search term
    const postsWithDetails = await Promise.all(
      savedPosts.map(async (savedPost) => {
        const postDetails = await fetchPostDetails(savedPost.postId);
        return {
          ...savedPost.toObject(),
          postDetails: postDetails || {}
        };
      })
    );

    // Filter by search term in title, description, or content
    const filtered = postsWithDetails.filter(item => {
      const post = item.postDetails;
      const searchLower = searchTerm?.toLowerCase() || '';
      return (
        (post.title && post.title.toLowerCase().includes(searchLower)) ||
        (post.description && post.description.toLowerCase().includes(searchLower)) ||
        (post.content && post.content.toLowerCase().includes(searchLower))
      );
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: 'Error searching saved posts', error: error.message });
  }
};

// Check if a post is saved
const checkSavedStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    const savedPost = await SavedPost.findOne({ userId, postId });
    
    res.json({
      isSaved: !!savedPost,
      category: savedPost ? savedPost.category : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking saved status', error: error.message });
  }
};

export {
  savePost,
  getSavedPosts,
  searchSavedPosts,
  checkSavedStatus
};