import { simplifyContentWithAI } from '../helpers/aiHelper.js';
import { Simplification } from '../models/Simplification.js';
import { config } from '../config/env.js';

export async function simplifyPost(req, res) {
  try {
    const { postId, content, level = 'detailed', forceRefresh = false } = req.body;
    const userId = req.userId;

    if (!postId || !content || content.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'postId and content are required' });
    }

    console.log(
      `✨ Simplifying post ${postId} with level: ${level} by user: ${userId} (forceRefresh: ${forceRefresh})`
    );

    // Check if simplification already exists
    let simplification = await Simplification.findOne({
      postId,
      simplificationLevel: level,
    });

    if (simplification && !forceRefresh) {
      console.log('✅ Using cached simplification');
      return res.status(200).json({
        success: true,
        cached: true,
        data: {
          simplifiedContent: simplification.simplifiedContent,
          conciseSummary: simplification.conciseSummary,
          detailedSummary: simplification.detailedSummary,
          keyTakeaways: simplification.keyTakeaways,
          readingLevel: simplification.readingLevel,
          simplifiedReadTime: simplification.simplifiedReadTime,
        },
      });
    }

    if (simplification && forceRefresh) {
      console.log('🔁 forceRefresh requested - regenerating simplification and overwriting cache');
    }

    console.log('🔄 Generating new simplification with AI');
    const aiResult = await simplifyContentWithAI(content, level);

    // Calculate reading times
    const originalWords = content.split(/\s+/).length;
    const simplifiedWords = (aiResult.simplifiedContent || '').split(/\s+/).length;
    const originalReadTime = Math.ceil(originalWords / 200); // avg 200 words per minute
    const simplifiedReadTime = Math.ceil(simplifiedWords / 200);

    // Determine reading level based on average word length
    const avgWordLength =
      simplifiedWords > 0 ? simplifiedWords / content.length : 0;
    let readingLevel = 'intermediate';
    if (avgWordLength < 4) readingLevel = 'beginner';
    if (avgWordLength > 5) readingLevel = 'advanced';

    // Upsert simplification (create or overwrite)
    const updated = await Simplification.findOneAndUpdate(
      { postId, simplificationLevel: level },
      {
        $set: {
          originalContent: content,
          simplifiedContent: aiResult.simplifiedContent,
          conciseSummary: aiResult.conciseSummary,
          detailedSummary: aiResult.detailedSummary,
          keyTakeaways: aiResult.keyTakeaways,
          readingLevel,
          originalReadTime,
          simplifiedReadTime,
          createdBy: userId,
          aiProvider: config.aiProvider || 'mock',
          isApproved: true,
        },
      },
      { upsert: true, new: true }
    );

    console.log('💾 Simplification saved/updated in database');

    res.status(200).json({
      success: true,
      cached: false,
      data: {
        simplifiedContent: updated.simplifiedContent,
        conciseSummary: updated.conciseSummary,
        detailedSummary: updated.detailedSummary,
        keyTakeaways: updated.keyTakeaways,
        readingLevel: updated.readingLevel,
        originalReadTime: updated.originalReadTime,
        simplifiedReadTime: updated.simplifiedReadTime,
      },
    });
  } catch (error) {
    console.error('❌ Error in simplifyPost:', error);
    res.status(500).json({
      error: 'Failed to simplify post',
      message: error.message,
    });
  }
}

export async function getSimplification(req, res) {
  try {
    const { postId, level = 'detailed' } = req.query;

    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }

    console.log(`📖 Fetching simplification for post: ${postId}`);

    const simplification = await Simplification.findOne({
      postId,
      simplificationLevel: level,
      isApproved: true,
    });

    if (!simplification) {
      return res.status(404).json({
        success: false,
        message: 'Simplification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        simplifiedContent: simplification.simplifiedContent,
        conciseSummary: simplification.conciseSummary,
        detailedSummary: simplification.detailedSummary,
        keyTakeaways: simplification.keyTakeaways,
        readingLevel: simplification.readingLevel,
        originalReadTime: simplification.originalReadTime,
        simplifiedReadTime: simplification.simplifiedReadTime,
      },
    });
  } catch (error) {
    console.error('❌ Error in getSimplification:', error);
    res.status(500).json({
      error: 'Failed to fetch simplification',
      message: error.message,
    });
  }
}
