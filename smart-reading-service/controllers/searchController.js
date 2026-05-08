import axios from 'axios';
import { findRelatedBlogs } from '../helpers/aiHelper.js';
import { RelatedBlog } from '../models/RelatedBlog.js';

export async function searchBlogs(req, res) {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    console.log(`Searching related blogs for: "${keyword}"`);

    // Check cache first
    let relatedBlog = await RelatedBlog.findOne({
      keyword: keyword.toLowerCase(),
    });

    if (relatedBlog) {
      console.log('Found cached related blogs');
      
      // Safety check: If cached blogs are missing IDs, invalidate and re-fetch
      const hasIds = relatedBlog.relatedPosts.every(p => p.postId || p.id);
      if (!hasIds) {
        console.log('⚠️ [SEARCH] Stale cache detected (missing IDs). Re-fetching...');
        await RelatedBlog.deleteOne({ _id: relatedBlog._id });
        // Continue to fresh fetch below
      } else {
        relatedBlog.searchCount += 1;
        await relatedBlog.save();

        return res.status(200).json({
          success: true,
          cached: true,
          data: relatedBlog.relatedPosts,
        });
      }
    }

    // Fetch posts from posts service
    console.log('Fetching posts from posts service');
    let allPosts = [];

    try {
      const response = await axios.get(
        'http://localhost:5000/api/posts?limit=100'
      );
      allPosts = response.data.posts || response.data;
    } catch (error) {
      console.warn('Could not fetch posts from posts service:', error.message);
      allPosts = [];
    }

    // Find related blogs using AI helper
    const relatedPosts = await findRelatedBlogs(keyword, allPosts);

    // Cache the result
    if (relatedPosts.length > 0) {
      relatedBlog = new RelatedBlog({
        keyword: keyword.toLowerCase(),
        relatedPosts,
        searchCount: 1,
      });

      await relatedBlog.save();
      console.log(' Related blogs cached');
    }

    res.status(200).json({
      success: true,
      cached: false,
      data: relatedPosts,
    });
  } catch (error) {
    console.error(' Error in searchBlogs:', error);
    res.status(500).json({
      error: 'Failed to search blogs',
      message: error.message,
    });
  }
}

export async function getRelatedBlogs(req, res) {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    console.log(`Fetching related blogs for: "${keyword}"`);

    const relatedBlog = await RelatedBlog.findOne({
      keyword: keyword.toLowerCase(),
    });

    if (!relatedBlog) {
      return res.status(404).json({
        success: false,
        message: 'No related blogs found',
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      data: relatedBlog.relatedPosts,
    });
  } catch (error) {
    console.error('Error in getRelatedBlogs:', error);
    res.status(500).json({
      error: 'Failed to fetch related blogs',
      message: error.message,
    });
  }
}
