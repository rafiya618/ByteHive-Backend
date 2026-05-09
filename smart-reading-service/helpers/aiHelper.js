import { config } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
// Standard model for text/chat
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
// Model optimized for JSON responses
const jsonModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 16384 // Increased to prevent truncation
  }
});

// Initialize OpenRouter as fallback (using OpenAI SDK with OpenRouter base URL)
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: config.openrouterApiKey || process.env.OPENROUTER_API_KEY || ''
});
const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

// Log AI configuration on startup
console.log('🤖 [AI-CONFIG] Smart Reading Service AI Configuration:');
console.log(`   ├─ Primary: Gemini (${config.geminiApiKey ? '✅ API Key Set' : '❌ No API Key'})`);
console.log(`   └─ Fallback: OpenRouter (${process.env.OPENROUTER_API_KEY ? '✅ API Key Set' : '❌ No API Key'})`);

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
        console.log('Fixed incomplete JSON by adding closing quote and brace');
        return fixed;
      } catch (e) {
        console.log('Could not fix incomplete JSON');
        throw error; // Re-throw original error
      }
    }
    throw error; // Re-throw if can't fix
  }
}

export async function getMeaningFromAI(word) {
  console.log(' getMeaningFromAI called for word:', word);
  console.log('Config check:', { aiProvider: config.aiProvider, hasGeminiKey: !!config.geminiApiKey });

  // Use Gemini AI
  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    console.log(' Using Gemini AI for meaning...');
    return await getGeminiMeaning(word);
  }

  // Use OpenRouter AI
  if (config.aiProvider === 'openrouter' && (config.openrouterApiKey || process.env.OPENROUTER_API_KEY)) {
    console.log(' Using OpenRouter for meaning...');
    const prompt = `You are a dictionary API. Provide a detailed definition for the word "${word}" in strict JSON format. 
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
    return await getOpenRouterMeaning(word, prompt);
  }

  // No AI provider configured - throw error
  console.log(' No AI provider configured. Config state:', {
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

  try {
    console.log(` [AI-MEANING] Requesting meaning for: ${word} via Gemini`);

    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ [AI-MEANING] SUCCESS via Gemini for: "${word}"`);
    
    const cleanedText = cleanJsonString(text);
    const fixedText = fixIncompleteJson(cleanedText);
    const parsed = JSON.parse(fixedText);

    return {
      word: parsed.word || word,
      definition: parsed.definition || `Definition for ${word}`,
      pronunciation: parsed.pronunciation || `/${word}/`,
      partOfSpeech: parsed.partOfSpeech || 'noun',
      examples: parsed.examples || [`Example with ${word}`],
      synonyms: parsed.synonyms || [],
      antonyms: parsed.antonyms || [],
      _provider: 'gemini' // Track which provider was used
    };
  } catch (error) {
    console.error(`❌ [AI-MEANING] Gemini FAILED for "${word}":`, error.message);
    console.log('🔄 [AI-MEANING] Falling back to OpenRouter...');
    
    // Fallback to OpenRouter
    return await getOpenRouterMeaning(word, prompt);
  }
}

// OpenRouter fallback for word meaning
async function getOpenRouterMeaning(word, prompt) {
  try {
    console.log(`🔄 [AI-MEANING] Using OpenRouter (${OPENROUTER_MODEL}) for: "${word}"`);
    
    const completion = await openrouter.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      headers: {
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "ByteHive Developer Platform",
      }
    });

    const text = completion.choices[0]?.message?.content || '{}';
    console.log(`✅ [AI-MEANING] SUCCESS via OpenRouter for: "${word}"`);

    const parsed = JSON.parse(cleanJsonString(text));
    return {
      word: parsed.word || word,
      definition: parsed.definition || `Definition for ${word}`,
      pronunciation: parsed.pronunciation || `/${word}/`,
      partOfSpeech: parsed.partOfSpeech || 'noun',
      examples: parsed.examples || [`Example with ${word}`],
      synonyms: parsed.synonyms || [],
      antonyms: parsed.antonyms || [],
      _provider: 'openrouter' // Track which provider was used
    };
  } catch (fallbackError) {
    console.error(`❌ [AI-MEANING] OpenRouter FAILED for "${word}":`, {
      message: fallbackError.message,
      status: fallbackError.status,
      response: fallbackError.response?.data
    });
    const meaningError = new Error(`AI Service temporarily unavailable (${fallbackError.message}). Please try again.`);
    meaningError.code = 'AI_PROCESSING_ERROR';
    meaningError.status = 500;
    throw meaningError;
  }
}

export async function simplifyContentWithAI(content, level = 'detailed') {
  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    return await simplifyWithGemini(content, level);
  }

  if (config.aiProvider === 'openrouter' && (config.openrouterApiKey || process.env.OPENROUTER_API_KEY)) {
    const { prompt, expectedFields } = getSimplificationPrompt(content, level);
    return await simplifyWithOpenRouter(content, level, prompt, expectedFields); 
  }

  // Fallback if no AI provider configured
  console.warn(' No AI provider configured or API keys missing');
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

// Helper to get prompt and expected fields for simplification
function getSimplificationPrompt(content, level) {
  let prompt = '';
  let expectedFields = [];

  if (level === 'summarize') {
    prompt = `Simplify the following blog post content into easier-to-understand language.\n\n**Task:** Rewrite the ENTIRE content using simpler words and shorter sentences.\n- Replace complex/technical words with common alternatives\n- Break long sentences into shorter ones (max 15 words each)\n- Maintain ALL information and details from original\n- Keep the SAME overall length as original\n- Preserve structure (paragraphs, lists, etc.)\n\n**Text to simplify:**\n${content}\n\n**Required JSON Structure:**\n{\n  "summarize": "The complete simplified version with all content preserved"\n}\n\n**Rules:**\n- NO summarization - keep full length\n- ONLY simplify language difficulty\n- Replace difficult words: utilize→use, implement→add, facilitate→help\n- Split complex sentences\n- Return ONLY the summarize field`;
    expectedFields = ['summarize'];
  } else if (level === 'key_takeaways') {
    prompt = `Extract the key takeaways from the following blog post.\n\n**Task:** Identify 3-5 MAIN points that capture the essence of the content.\n\n**Text:**\n${content}\n\n**Required JSON Structure:**\n{\n  "keyTakeaways": [\n    "Complete, standalone sentence summarizing main point 1",\n    "Complete, standalone sentence summarizing main point 2",\n    "Complete, standalone sentence summarizing main point 3"\n  ]\n}\n\n**Rules:**\n- Extract EXACTLY 3-5 points (no more, no less)\n- Each point must be a COMPLETE sentence (subject + verb + object)\n- Each must be STANDALONE (understandable without context)\n- Focus on actionable insights or key facts\n- NO fragments like "The importance of..." or "How to..."\n- NO references like "This article..." or "The post..."\n- Return ONLY the keyTakeaways array`;
    expectedFields = ['keyTakeaways'];
  } else if (level === 'concise_summary') {
    prompt = `Create a concise summary of the following blog post.\n\n**Task:** Condense the content into a brief 2-3 sentence overview.\n\n**Text:**\n${content}\n\n**Required JSON Structure:**\n{\n  "conciseSummary": "A brief 2-3 sentence summary capturing the main message"\n}\n\n**Rules:**\n- EXACTLY 2-3 sentences (no more, no less)\n- Focus on the PRIMARY message/conclusion\n- Self-contained (no "this article" or "the post")\n- Clear and direct language\n- Omit minor details and examples\n- Maximum 60 words total\n- Return ONLY the conciseSummary field`;
    expectedFields = ['conciseSummary'];
  } else {
    prompt = `Create a comprehensive summary of the following blog post.\n\n**Task:** Provide a detailed summary covering all major points and key supporting details.\n\n**Text:**\n${content}\n\n**Required JSON Structure:**\n{\n  "detailedSummary": "A detailed 5-7 sentence summary covering all major points with supporting details"\n}\n\n**Rules:**\n- EXACTLY 5-7 sentences (comprehensive but concise)\n- Cover ALL major points and themes\n- Include key supporting details and examples\n- Maintain logical flow between sentences\n- Self-contained (readable alone without original)\n- Preserve important technical terms\n- Maximum 300 words total\n- MUST end with a complete sentence\n- Return ONLY the detailedSummary field`;
    expectedFields = ['detailedSummary'];
  }
  return { prompt, expectedFields };
}

async function simplifyWithGemini(content, level = 'detailed_summary') {
  const { prompt, expectedFields } = getSimplificationPrompt(content, level);

  // ========== SINGLE ATTEMPT + OPENROUTER FALLBACK ==========
  try {
    console.log(`📤 [AI-SIMPLIFY] Generating ${level} with Gemini`);

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
      console.warn(`Missing expected fields for ${level}:`, expectedFields);
    }

    // Return ONLY the expected fields for this type
    const resultData = {};
    expectedFields.forEach(field => {
      resultData[field] = parsed[field] || null;
    });

    console.log(`✅ [AI-SIMPLIFY] SUCCESS via Gemini for: ${level}`);
    resultData._provider = 'gemini'; // Track which provider was used
    return resultData;

  } catch (error) {
    console.error(`❌ [AI-SIMPLIFY] Gemini FAILED for ${level}:`, error.message);
    console.log('🔄 [AI-SIMPLIFY] Falling back to OpenRouter...');
    
    // Fallback to OpenRouter
    return await simplifyWithOpenRouter(content, level, prompt, expectedFields);
  }
}

// OpenRouter fallback for content simplification
async function simplifyWithOpenRouter(content, level, prompt, expectedFields) {
  try {
    console.log(`[AI-SIMPLIFY] Using OpenRouter (${OPENROUTER_MODEL}) for: ${level}`);
    console.log(`[AI-SIMPLIFY] API Key present: ${!!(config.openrouterApiKey || process.env.OPENROUTER_API_KEY)}`);
    
    const completion = await openrouter.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      headers: {
        "HTTP-Referer": "http://localhost:5173", // Required for some OpenRouter models
        "X-Title": "ByteHive Developer Platform",
      }
    });

    const text = completion.choices[0]?.message?.content || '{}';
    console.log(`[AI-SIMPLIFY] SUCCESS via OpenRouter for: ${level}`);
    console.log(`[AI-SIMPLIFY] Response length: ${text.length}`);

    const cleanedText = cleanJsonString(text);
    const fixedText = fixIncompleteJson(cleanedText);
    const parsed = JSON.parse(fixedText);

    // Return ONLY the expected fields for this type
    const resultData = {};
    expectedFields.forEach(field => {
      resultData[field] = parsed[field] || null;
    });

    resultData._provider = 'openrouter'; // Track which provider was used
    return resultData;

  } catch (fallbackError) {
    console.error(`❌ [AI-SIMPLIFY] OpenRouter FAILED for ${level}:`);
    console.error(`   ├─ Message: ${fallbackError.message}`);
    console.error(`   ├─ Status: ${fallbackError.status}`);
    console.error(`   └─ Data: ${JSON.stringify(fallbackError.response?.data || {})}`);
    
    // Return error response instead of throwing
    const errorMsg = `AI service temporarily unavailable (${fallbackError.message}). Please try again.`;
    if (level === 'summarize') return { summarize: errorMsg, _provider: 'none' };
    if (level === 'key_takeaways') return { keyTakeaways: [errorMsg], _provider: 'none' };
    if (level === 'concise_summary') return { conciseSummary: errorMsg, _provider: 'none' };
    return { detailedSummary: errorMsg, _provider: 'none' };
  }
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
  console.log(' chatAboutWord called:', { word, aiProvider: config.aiProvider, hasGeminiKey: !!config.geminiApiKey });

  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    console.log('Using Gemini for chat');
    return await chatWithGemini(word, userMessage);
  }

  if (config.aiProvider === 'openrouter' && (config.openrouterApiKey || process.env.OPENROUTER_API_KEY)) {
    console.log('Using OpenRouter for chat');
    const prompt = `You are a helpful AI assistant specializing in explaining concepts related to "${word}". 
    User's question: "${userMessage}"
    Required JSON Structure:
    {
      "summary": "A brief 2-line summary of the answer",
      "keyPoints": ["Key detail 1", "Key detail 2", "Key detail 3"]
    }`;
    return await chatWithOpenRouter(word, userMessage, prompt);
  }
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

  try {
    console.log(`💬 [AI-CHAT] Chatting about: "${word}" via Gemini`);

    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ [AI-CHAT] SUCCESS via Gemini for: "${word}"`);

    const parsed = JSON.parse(cleanJsonString(text));
    return {
      summary: parsed.summary || "Summary temporarily unavailable.",
      keyPoints: parsed.keyPoints || ["Details temporarily unavailable."],
      _provider: 'gemini'
    };
  } catch (error) {
    console.error(`❌ [AI-CHAT] Gemini FAILED for "${word}":`, error.message);
    console.log('🔄 [AI-CHAT] Falling back to OpenRouter...');
    
    // Fallback to OpenRouter
    return await chatWithOpenRouter(word, userMessage, prompt);
  }
}

// OpenRouter fallback for chat
async function chatWithOpenRouter(word, userMessage, prompt) {
  try {
    console.log(`🔄 [AI-CHAT] Using OpenRouter (${OPENROUTER_MODEL}) for: "${word}"`);
    
    const completion = await openrouter.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      headers: {
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "ByteHive Developer Platform",
      }
    });

    const text = completion.choices[0]?.message?.content || '{}';
    console.log(`✅ [AI-CHAT] SUCCESS via OpenRouter for: "${word}"`);

    const parsed = JSON.parse(cleanJsonString(text));
    return {
      summary: parsed.summary || "Summary temporarily unavailable.",
      keyPoints: parsed.keyPoints || ["Details temporarily unavailable."],
      _provider: 'openrouter'
    };
  } catch (fallbackError) {
    console.error(`❌ [AI-CHAT] OpenRouter FAILED for "${word}":`, fallbackError.message);
    return {
      summary: `I'm sorry, I couldn't process your question about "${word}" right now.`,
      keyPoints: ["Please try again later."],
      _provider: 'none'
    };
  }
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
    postId: String(post._id || post.id),
    id: String(post._id || post.id),
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
