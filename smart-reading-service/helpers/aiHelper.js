import { config } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
// Standard model for text/chat
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
// Model optimized for JSON responses
const jsonModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 16384 // Increased to prevent truncation
  }
});

// Helper to clean JSON string from Markdown formatting
function cleanJsonString(text) {
  if (!text) return "{}";
  // Remove markdown code blocks if present
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  return clean.trim();
}

// Helper to attempt fixing incomplete JSON
function fixIncompleteJson(text) {
  try {
    JSON.parse(text);
    return text; // Already valid
  } catch (error) {
    if (error.message.includes('Unterminated string')) {
      // Try to close the string
      let fixed = text.trim();
      if (!fixed.endsWith('"')) {
        fixed += '"';
      }
      if (!fixed.endsWith('}')) {
        fixed += '}';
      }
      try {
        JSON.parse(fixed);
        console.log('✅ Fixed incomplete JSON by adding closing quote and brace');
        return fixed;
      } catch (e) {
        console.log('❌ Could not fix incomplete JSON');
        throw error; // Re-throw original error
      }
    }
    throw error; // Re-throw if can't fix
  }
}

export async function getMeaningFromAI(word) {
  console.log('📖 getMeaningFromAI called for word:', word);
  console.log('🔍 Config check:', { aiProvider: config.aiProvider, hasGeminiKey: !!config.geminiApiKey });

  // ALWAYS use Gemini AI - Single Source of Truth
  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    console.log('🤖 Using Gemini AI for meaning...');
    return await getGeminiMeaning(word);
  }

  // If using other AI providers
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    console.log('🤖 Using OpenAI for meaning...');
    return await getOpenAIMeaning(word);
  }

  // No AI provider configured - throw error
  console.log('❌ No AI provider configured. Config state:', {
    aiProvider: config.aiProvider,
    hasGeminiKey: !!config.geminiApiKey,
    hasOpenAIKey: !!config.openaiApiKey
  });

  throw new Error('AI service unavailable - no provider configured');
}

async function getGeminiMeaning(word) {
  const prompt = `You are a dictionary API. Provide a detailed definition for the word "${word}" in strict JSON format. 
    Refuse to provide non-JSON text.
    
    Required JSON Structure:
    {
      "word": "${word}",
      "definition": "A clear, comprehensive definition",
      "pronunciation": "Phonetic pronunciation (IPA)",
      "partOfSpeech": "noun/verb/adjective/etc",
      "examples": ["Example sentence 1", "Example sentence 2"],
      "synonyms": ["synonym1", "synonym2"],
      "antonyms": ["antonym1", "antonym2"]
    }`;

  // Retry logic for API calls
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      console.log(`📤 [AI-MEANING] Attempt ${attempt}/${maxRetries} - Requesting meaning for: ${word}`);

      // Use jsonModel for better JSON enforcement
      const result = await jsonModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📥 [AI-MEANING] Response from Gemini:', text);

      // Try to parse JSON response with cleaning
      try {
        const parsed = JSON.parse(cleanJsonString(text));
        // Basic validation/fallback
        return {
          word: parsed.word || word,
          definition: parsed.definition || `Definition for ${word}`,
          pronunciation: parsed.pronunciation || `/${word}/`,
          partOfSpeech: parsed.partOfSpeech || 'noun',
          examples: parsed.examples || [`Example with ${word}`],
          synonyms: parsed.synonyms || [],
          antonyms: parsed.antonyms || [],
        };
      } catch (parseError) {
        console.warn(`Failed to parse Gemini response as JSON (Attempt ${attempt})`);
        if (attempt === maxRetries) {
          throw parseError;
        }
        await sleep(500);
        continue;
      }
    } catch (error) {
      const errorStatus = error.status || error.response?.status;
      const errorMessage = error.message || '';

      console.error(`❌ [AI-MEANING] Error on attempt ${attempt}/${maxRetries}:`, errorMessage);

      // Handle retryable errors
      if ((errorStatus === 503 || errorStatus === 502 || errorStatus === 429 ||
        errorMessage.includes('overloaded') || errorMessage.includes('unavailable'))
        && attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`⚠️ [AI-MEANING] Retrying in ${backoffDelay}ms...`);
        await sleep(backoffDelay);
        continue;
      }

      // API key issues
      if (errorStatus === 403 || errorStatus === 401 || errorMessage.includes('API key')) {
        console.error('⚠️ POTENTIAL API KEY ISSUE. Please check your GEMINI_API_KEY.');
        const apiKeyError = new Error('AI service authentication failed. Please check your GEMINI_API_KEY configuration.');
        apiKeyError.code = 'API_KEY_INVALID';
        apiKeyError.status = 403;
        throw apiKeyError;
      }

      // If all retries failed or non-retryable error, throw the error
      console.error(`❌ [AI-MEANING] All retries exhausted for: ${word}`);
      const meaningError = new Error(`Failed to generate meaning for "${word}": ${errorMessage}`);
      meaningError.code = error.code || 'AI_PROCESSING_ERROR';
      meaningError.status = errorStatus || 500;
      throw meaningError;
    }
  }

  // Fallback if somehow we exit the loop without success
  const fallbackError = new Error(`Failed to generate meaning for "${word}" after ${maxRetries} attempts`);
  fallbackError.code = 'MAX_RETRIES_EXCEEDED';
  fallbackError.status = 500;
  throw fallbackError;
}

async function getOpenAIMeaning(word) {
  // Placeholder for OpenAI integration
  console.log('🔄 OpenAI integration placeholder for:', word);
  return mockMeanings[word.toLowerCase()] || {
    word,
    definition: `AI-generated definition for ${word}`,
  };
}

export async function simplifyContentWithAI(content, level = 'detailed') {
  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    return await simplifyWithGemini(content, level);
  }

  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    return await simplifyWithOpenAI(content, level);
  }

  // Fallback if no AI provider configured
  console.warn('⚠️ No AI provider configured or API keys missing');
  const errorMsg = 'AI Configuration Error: No provider available (Check API Keys)';

  if (level === 'summarize') return { summarize: errorMsg };
  if (level === 'key_takeaways') return { keyTakeaways: [errorMsg] };
  if (level === 'concise_summary') return { conciseSummary: errorMsg };
  return { detailedSummary: errorMsg };
}

// Helper function for exponential backoff delays
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simplifyWithGemini(content, level = 'detailed_summary') {
  let prompt = '';
  let expectedFields = [];

  // ========== SEPARATE PROMPTS PER TYPE ==========

  if (level === 'summarize') {
    // TYPE 1: SUMMARIZE - Simplify language, keep same length
    prompt = `Simplify the following blog post content into easier-to-understand language.

**Task:** Rewrite the ENTIRE content using simpler words and shorter sentences.
- Replace complex/technical words with common alternatives
- Break long sentences into shorter ones (max 15 words each)
- Maintain ALL information and details from original
- Keep the SAME overall length as original
- Preserve structure (paragraphs, lists, etc.)

**Text to simplify:**
${content}

**Required JSON Structure:**
{
  "summarize": "The complete simplified version with all content preserved"
}

**Rules:**
- NO summarization - keep full length
- ONLY simplify language difficulty
- Replace difficult words: utilize→use, implement→add, facilitate→help
- Split complex sentences
- Return ONLY the summarize field`;
    expectedFields = ['summarize'];

  } else if (level === 'key_takeaways') {
    // TYPE 2: KEY TAKEAWAYS - Extract 3-5 main points as bullets
    prompt = `Extract the key takeaways from the following blog post.

**Task:** Identify 3-5 MAIN points that capture the essence of the content.

**Text:**
${content}

**Required JSON Structure:**
{
  "keyTakeaways": [
    "Complete, standalone sentence summarizing main point 1",
    "Complete, standalone sentence summarizing main point 2",
    "Complete, standalone sentence summarizing main point 3"
  ]
}

**Rules:**
- Extract EXACTLY 3-5 points (no more, no less)
- Each point must be a COMPLETE sentence (subject + verb + object)
- Each must be STANDALONE (understandable without context)
- Focus on actionable insights or key facts
- NO fragments like "The importance of..." or "How to..."
- NO references like "This article..." or "The post..."
- Return ONLY the keyTakeaways array`;
    expectedFields = ['keyTakeaways'];

  } else if (level === 'concise_summary') {
    // TYPE 3: CONCISE SUMMARY - Brief 2-3 sentence overview
    prompt = `Create a concise summary of the following blog post.

**Task:** Condense the content into a brief 2-3 sentence overview.

**Text:**
${content}

**Required JSON Structure:**
{
  "conciseSummary": "A brief 2-3 sentence summary capturing the main message"
}

**Rules:**
- EXACTLY 2-3 sentences (no more, no less)
- Focus on the PRIMARY message/conclusion
- Self-contained (no "this article" or "the post")
- Clear and direct language
- Omit minor details and examples
- Maximum 60 words total
- Return ONLY the conciseSummary field`;
    expectedFields = ['conciseSummary'];

  } else {
    // TYPE 4: DETAILED SUMMARY - Comprehensive 5-7 sentence summary
    prompt = `Create a comprehensive summary of the following blog post.

**Task:** Provide a detailed summary covering all major points and key supporting details.

**Text:**
${content}

**Required JSON Structure:**
{
  "detailedSummary": "A detailed 5-7 sentence summary covering all major points with supporting details"
}

**Rules:**
- EXACTLY 5-7 sentences (comprehensive but concise)
- Cover ALL major points and themes
- Include key supporting details and examples
- Maintain logical flow between sentences
- Self-contained (readable alone without original)
- Preserve important technical terms
- Maximum 300 words total (do not strict limit, prioritize completeness)
- MUST end with a complete sentence (NO ellipsis ...)
- Return ONLY the detailedSummary field`;
    expectedFields = ['detailedSummary'];
  }

  // ========== API RETRY LOGIC WITH EXPONENTIAL BACKOFF ==========
  const maxApiRetries = 5; // Maximum number of API call retries
  const maxParseRetries = 3; // Maximum retries for JSON parsing errors
  let apiAttempt = 0;

  while (apiAttempt < maxApiRetries) {
    apiAttempt++;

    try {
      console.log(`📤 [AI-SIMPLIFY] API Call ${apiAttempt}/${maxApiRetries} - Generating ${level} with Gemini`);

      // Retry logic for JSON parsing errors within each API call
      let parseAttempt = 0;

      while (parseAttempt < maxParseRetries) {
        parseAttempt++;

        try {
          console.log(`  📋 [AI-SIMPLIFY] Parse Attempt ${parseAttempt}/${maxParseRetries}`);

          // Use jsonModel for better JSON enforcement
          const result = await jsonModel.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          console.log(`📥 [AI-SIMPLIFY] RAW RESPONSE (Length: ${text.length}):\n${text.substring(0, 200)}...`);

          const cleanedText = cleanJsonString(text);
          const fixedText = fixIncompleteJson(cleanedText);
          const parsed = JSON.parse(fixedText);

          // Validate expected fields exist
          const hasAllFields = expectedFields.every(field => parsed[field]);
          if (!hasAllFields) {
            console.warn(`⚠️ Missing expected fields for ${level}:`, expectedFields);
          }

          // Return ONLY the expected fields for this type
          const resultData = {};
          expectedFields.forEach(field => {
            resultData[field] = parsed[field] || null;
          });

          console.log(`✅ [AI-SIMPLIFY] Successfully generated ${level} (API attempt ${apiAttempt}, Parse attempt ${parseAttempt})`);
          return resultData;

        } catch (parseError) {
          console.error(`❌ [AI-SIMPLIFY] JSON Parse Error (Parse Attempt ${parseAttempt}/${maxParseRetries}):`, parseError.message);

          if (parseAttempt === maxParseRetries) {
            // If we've exhausted parse retries, throw to trigger API retry
            throw parseError;
          }
          // Small delay before parse retry
          await sleep(500);
        }
      }

    } catch (error) {
      const errorMessage = error.message || '';
      const errorStatus = error.status || error.response?.status;

      console.error(`❌ [AI-SIMPLIFY] Error on API attempt ${apiAttempt}/${maxApiRetries}:`, errorMessage);
      console.error(`   Status: ${errorStatus}, Full error:`, error);

      // ========== HANDLE RETRYABLE ERRORS WITH EXPONENTIAL BACKOFF ==========

      // 503 Service Unavailable - Model overloaded (RETRYABLE)
      if (errorStatus === 503 || errorMessage.includes('overloaded') || errorMessage.includes('Service Unavailable')) {
        if (apiAttempt < maxApiRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, apiAttempt - 1), 30000); // Cap at 30 seconds
          console.warn(`⚠️ [AI-SIMPLIFY] Service overloaded (503). Retrying in ${backoffDelay}ms (attempt ${apiAttempt + 1}/${maxApiRetries})...`);
          await sleep(backoffDelay);
          continue; // Retry the API call
        } else {
          // Exhausted all retries for 503
          const serviceError = new Error('AI service is currently overloaded. We tried multiple times but the service is busy. Please try again in a few minutes.');
          serviceError.code = 'SERVICE_UNAVAILABLE';
          serviceError.status = 503;
          throw serviceError;
        }
      }

      // 429 Rate Limit / Quota Exceeded (RETRYABLE with longer backoff)
      if (errorStatus === 429 || errorMessage.includes('quota') || errorMessage.includes('Too Many Requests')) {
        if (apiAttempt < maxApiRetries) {
          const backoffDelay = Math.min(2000 * Math.pow(2, apiAttempt - 1), 60000); // Cap at 60 seconds, longer delays
          console.warn(`⚠️ [AI-SIMPLIFY] Rate limit exceeded (429). Retrying in ${backoffDelay}ms (attempt ${apiAttempt + 1}/${maxApiRetries})...`);
          await sleep(backoffDelay);
          continue; // Retry the API call
        } else {
          // Exhausted all retries for 429
          const quotaError = new Error('AI service quota exceeded. Please try again later or contact support to upgrade your plan.');
          quotaError.code = 'QUOTA_EXCEEDED';
          quotaError.status = 429;
          throw quotaError;
        }
      }

      // 502 Bad Gateway (RETRYABLE - temporary server issue)
      if (errorStatus === 502 || errorMessage.includes('Bad Gateway')) {
        if (apiAttempt < maxApiRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, apiAttempt - 1), 30000);
          console.warn(`⚠️ [AI-SIMPLIFY] Bad Gateway (502). Retrying in ${backoffDelay}ms (attempt ${apiAttempt + 1}/${maxApiRetries})...`);
          await sleep(backoffDelay);
          continue; // Retry the API call
        } else {
          const serviceError = new Error('AI service is temporarily unavailable (Bad Gateway). Please try again in a few moments.');
          serviceError.code = 'SERVICE_UNAVAILABLE';
          serviceError.status = 502;
          throw serviceError;
        }
      }

      // ========== HANDLE NON-RETRYABLE ERRORS ==========

      // 401/403 API Key Issues (NON-RETRYABLE - no point retrying with same bad key)
      if (errorStatus === 403 || errorStatus === 401 || errorMessage.includes('API key')) {
        const apiKeyError = new Error('AI service authentication failed. Please check API configuration.');
        apiKeyError.code = 'API_KEY_INVALID';
        apiKeyError.status = 403;
        throw apiKeyError;
      }

      // Generic/Unknown errors - still retry a few times in case it's transient
      if (apiAttempt < maxApiRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, apiAttempt - 1), 20000);
        console.warn(`⚠️ [AI-SIMPLIFY] Unknown error. Retrying in ${backoffDelay}ms (attempt ${apiAttempt + 1}/${maxApiRetries})...`);
        await sleep(backoffDelay);
        continue; // Retry the API call
      } else {
        // Exhausted all retries for unknown error
        const genericError = new Error(`Failed to generate AI content after ${maxApiRetries} attempts: ${errorMessage}`);
        genericError.code = 'AI_PROCESSING_ERROR';
        genericError.status = 500;
        throw genericError;
      }
    }
  }

  // This should never be reached, but just in case
  const fallbackError = new Error('Failed to simplify content after maximum retries');
  fallbackError.code = 'MAX_RETRIES_EXCEEDED';
  fallbackError.status = 500;
  throw fallbackError;
}

function generateMockSimplification(content) {
  // Remove complex sentences and simplify
  const sentences = content.split('. ');
  return sentences
    .map((sentence) => simplifySentence(sentence.trim()))
    .join('. ');
}

function simplifySentence(sentence) {
  // Replace complex words with simpler ones
  const complexToSimple = {
    utilize: 'use',
    implement: 'add',
    facilitate: 'help',
    inherently: 'naturally',
    fundamental: 'basic',
    subsequently: 'then',
  };

  let simplified = sentence;
  for (const [complex, simple] of Object.entries(complexToSimple)) {
    simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
  }
  return simplified;
}

function generateMockConciseSummary(content) {
  // Return first 2-3 sentences
  const sentences = content.split('. ');
  return sentences.slice(0, 2).join('. ') + '.';
}

function generateMockDetailedSummary(content) {
  // Mock detailed summary (5-7 sentences)
  return `This is a comprehensive summary of the provided content. The main topic discusses the evolution of digital trends. Key points include the impact on user behavior and interface design. The article also touches on future predictions for the industry. Overall, it provides a deep dive into modern technological shifts.`;
}

function generateMockKeyTakeaways(content) {
  // Extract key phrases - take complete sentences
  const sentences = content.split('. ').filter(s => s.trim().length > 0);
  return sentences.slice(0, 3).map((s) => {
    // Return complete sentence with proper ending
    const trimmed = s.trim();
    return trimmed.endsWith('.') ? trimmed : trimmed + '.';
  });
}

async function simplifyWithOpenAI(content, level) {
  // Placeholder for OpenAI integration
  console.log('🔄 OpenAI simplification placeholder');
  return {
    simplifiedContent: content,
    conciseSummary: 'AI-generated concise summary',
    detailedSummary: 'AI-generated detailed summary',
    keyTakeaways: ['Key point 1', 'Key point 2', 'Key point 3'],
  };
}

export async function chatAboutWord(word, userMessage) {
  console.log('🔍 chatAboutWord called:', { word, aiProvider: config.aiProvider, hasGeminiKey: !!config.geminiApiKey });

  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    console.log('✅ Using Gemini for chat');
    return await chatWithGemini(word, userMessage);
  }

  console.log('⚠️ Falling back to mock response');
  // Mock response
  return `I understand you're asking about "${word}". ${userMessage} - This is a mock response. Please integrate with a real AI provider.`;
}

async function chatWithGemini(word, userMessage) {
  const prompt = `You are a helpful AI assistant specializing in explaining concepts related to "${word}". 

User's question: "${userMessage}"

Please provide a helpful, accurate response regarding "${word}" that addresses the user's question. 
Output your response in strict JSON format.

Required JSON Structure:
{
  "summary": "A brief 2-line summary of the answer",
  "keyPoints": [
    "Key detail 1",
    "Key detail 2",
    "Key detail 3"
  ]
}

Keep the content concise and focused.`;

  // Retry logic for API calls
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      console.log(`📤 [AI-SEARCH] Attempt ${attempt}/${maxRetries} - Chatting about: ${word}`);

      // Use jsonModel to enforce JSON structure
      const result = await jsonModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📥 [AI-SEARCH] Response from Gemini:', text);

      try {
        const parsed = JSON.parse(cleanJsonString(text));
        return {
          summary: parsed.summary || "Summary temporarily unavailable.",
          keyPoints: parsed.keyPoints || ["Details temporarily unavailable."]
        };
      } catch (parseError) {
        console.warn(`Failed to parse Gemini chat response as JSON (Attempt ${attempt}):`, parseError);

        if (attempt === maxRetries) {
          // Fallback: return the raw text if parsing fails, frontend will handle it as string
          return text.trim();
        }
        await sleep(500);
        continue;
      }
    } catch (error) {
      const errorStatus = error.status || error.response?.status;
      const errorMessage = error.message || '';

      console.error(`❌ [AI-SEARCH] Error on attempt ${attempt}/${maxRetries}:`, errorMessage);

      // Handle retryable errors
      if ((errorStatus === 503 || errorStatus === 502 || errorStatus === 429 ||
        errorMessage.includes('overloaded') || errorMessage.includes('unavailable'))
        && attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`⚠️ [AI-SEARCH] Retrying in ${backoffDelay}ms...`);
        await sleep(backoffDelay);
        continue;
      }

      // Return fallback if all retries failed or non-retryable error
      console.warn(`⚠️ [AI-SEARCH] Returning fallback response`);
      return {
        summary: `I'm sorry, I couldn't process your question about "${word}" right now.`,
        keyPoints: ["Please try again later."]
      };
    }
  }

  // Fallback if somehow we exit the loop
  return {
    summary: `I'm sorry, I couldn't process your question about "${word}" right now.`,
    keyPoints: ["Please try again later."]
  };
}

// Find related blogs based on keyword
export async function findRelatedBlogs(keyword, posts) {
  if (!posts || posts.length === 0) {
    return [];
  }

  const keywordLower = keyword.toLowerCase();

  // Score and filter posts based on relevance
  const scoredPosts = posts
    .map(post => ({
      ...post,
      relevance: calculateRelevance(post, keywordLower)
    }))
    .filter(post => post.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5); // Return top 5 related posts

  return scoredPosts.map(post => ({
    id: post._id || post.id,
    title: post.post_title || post.title || 'Untitled',
    snippet: (post.post_description || post.description || '').substring(0, 150) + '...',
    readTime: `${Math.ceil((post.post_description || post.description || '').split(' ').length / 200)} min read`,
    relevance: post.relevance,
  }));
}

function calculateRelevance(post, keyword) {
  let score = 0;
  const title = (post.post_title || '').toLowerCase();
  const description = (post.post_description || '').toLowerCase();

  // Title matches are worth more
  if (title.includes(keyword)) score += 10;
  if (description.includes(keyword)) score += 5;

  // Count occurrences
  const titleMatches = (title.match(new RegExp(keyword, 'g')) || []).length;
  const descMatches = (description.match(new RegExp(keyword, 'g')) || []).length;

  score += titleMatches * 3 + descMatches * 1;

  return Math.min(score, 100); // Cap at 100
}
