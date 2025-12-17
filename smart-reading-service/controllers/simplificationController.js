import { simplifyContentWithAI } from '../helpers/aiHelper.js';

// Helper function for validation
const isValidSimplificationLevel = (level) => {
  const validLevels = ['summarize', 'key_takeaways', 'concise_summary', 'detailed_summary'];
  return validLevels.includes(level);
};

export const simplifyPost = async (req, res) => {
  try {
    const { postId, content, simplificationLevel = 'detailed_summary' } = req.body;

    console.log(`✨ Simplifying post ${postId} with level: ${simplificationLevel} by user: ${req.user?.id}`);

    // Validate input
    if (!content || !postId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: postId and content'
      });
    }

    // Validate simplification level
    if (!isValidSimplificationLevel(simplificationLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid simplification level: "${simplificationLevel}". Must be one of: summarize, key_takeaways, concise_summary, detailed_summary`
      });
    }

    console.log('📋 Requested level:', simplificationLevel);

    // Always generate fresh simplification (no caching)
    console.log('🔄 Generating fresh simplification with AI');
    const simplifiedData = await simplifyContentWithAI(content, simplificationLevel);

    return res.status(200).json({
      success: true,
      message: 'Post simplified successfully',
      data: simplifiedData
    });
  } catch (error) {
    console.error('❌ Error in simplifyPost:', error);

    // Handle specific error codes from AI helper
    if (error.code === 'SERVICE_UNAVAILABLE') {
      return res.status(503).json({
        success: false,
        error: error.message || 'AI service is temporarily unavailable. Please try again in a few moments.',
        code: error.code,
        retryAfter: 60 // Suggest retry after 60 seconds
      });
    }

    if (error.code === 'QUOTA_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: error.message || 'AI service quota exceeded. Please try again later.',
        code: error.code,
        retryAfter: 300 // Suggest retry after 5 minutes
      });
    }

    if (error.code === 'API_KEY_INVALID') {
      return res.status(503).json({
        success: false,
        error: 'AI service is temporarily unavailable. Please try again later.',
        code: 'SERVICE_UNAVAILABLE', // Don't expose internal API key issues to frontend
        details: 'Service configuration error'
      });
    }

    if (error.code === 'AI_PROCESSING_ERROR' || error.code === 'MAX_RETRIES_EXCEEDED') {
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process your request. Please try again.',
        code: error.code
      });
    }

    // Generic error fallback
    return res.status(500).json({
      success: false,
      error: 'Failed to simplify post. Please try again.',
      details: error.message
    });
  }
};
