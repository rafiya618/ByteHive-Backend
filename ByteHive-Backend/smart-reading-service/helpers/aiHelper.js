import { config } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
// Standard model for text/chat
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
// Model optimized for JSON responses
const jsonModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: "application/json" }
});

// Helper to clean JSON string from Markdown formatting
function cleanJsonString(text) {
  if (!text) return "{}";
  // Remove markdown code blocks if present
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  return clean.trim();
}

export async function getMeaningFromAI(word) {
  console.log('📖 getMeaningFromAI called for word:', word);

  try {
    // Try dictionary API first for real data
    console.log('🔄 Trying dictionary API...');
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) throw new Error('Word not found in dictionary');

    const data = await response.json();
    console.log('📥 [DICTIONARY-API] Raw Response:', JSON.stringify(data, null, 2));
    const entry = data[0];

    const meaning = entry.meanings[0];
    const definition = meaning.definitions[0].definition;
    const partOfSpeech = meaning.partOfSpeech;
    const pronunciation = entry.phonetics?.find(p => p.text)?.text || `/${word}/`;

    // Better example handling - filter out empties before mapping
    const validExamples = meaning.definitions
      .map(d => d.example)
      .filter(ex => ex && ex.trim().length > 0);

    // FIX: If no examples found, throw error to trigger AI fallback
    if (validExamples.length === 0) {
      console.log('⚠️ Dictionary API found definition but NO examples. Triggering AI fallback for better content.');
      throw new Error('Dictionary API missing examples');
    }

    const examples = validExamples.slice(0, 2);

    console.log('✅ Dictionary API processed data:', { word, definition, examples });
    return {
      word: entry.word,
      definition,
      pronunciation,
      partOfSpeech,
      examples,
      synonyms: meaning.synonyms?.slice(0, 5) || [],
      antonyms: meaning.antonyms?.slice(0, 3) || [],
    };
  } catch (error) {
    console.log('⚠️ Dictionary API failed, falling back:', error.message);
    console.log('🔍 Config check:', { aiProvider: config.aiProvider, hasGeminiKey: !!config.geminiApiKey });

    // Fallback to Gemini AI
    if (config.aiProvider === 'gemini' && config.geminiApiKey) {
      console.log('🤖 Using Gemini AI for meaning...');
      return await getGeminiMeaning(word);
    }

    // If using other AI providers
    if (config.aiProvider === 'openai' && config.openaiApiKey) {
      console.log('🤖 Using OpenAI for meaning...');
      return await getOpenAIMeaning(word);
    }

    console.log('❌ No AI provider available, returning mock');
    // Default mock response
    return {
      word,
      definition: `Definition of ${word} - This is a placeholder definition. Please provide real API integration.`,
      pronunciation: '/word/',
      partOfSpeech: 'noun',
      examples: [`Example sentence with ${word}`],
      synonyms: ['similar_word'],
      antonyms: [],
    };
  }
}

async function getGeminiMeaning(word) {
  try {
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

    // Use jsonModel for better JSON enforcement
    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📤 [AI-MEANING] Prompt sent to Gemini:', prompt);
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
      console.warn('Failed to parse Gemini response as JSON even after cleaning');
      throw parseError; // Let outer catch handle it
    }
  } catch (error) {
    console.error('Error calling Gemini API for meaning:', error);
    return {
      word,
      definition: `AI-generated definition for ${word}`,
      pronunciation: `/${word}/`,
      partOfSpeech: 'noun',
      examples: [`Example sentence with ${word}`],
      synonyms: [],
      antonyms: [],
    };
  }
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

  // Mock simplification
  return {
    simplifiedContent: generateMockSimplification(content),
    conciseSummary: generateMockConciseSummary(content),
    detailedSummary: generateMockDetailedSummary(content),
    keyTakeaways: generateMockKeyTakeaways(content),
  };
}

async function simplifyWithGemini(content, level = 'detailed') {
  try {
    const prompt = `Simplify the following text and provide the response in strict JSON format.
    
    Text to simplify:
    ${content}
    
    Required JSON Structure:
    {
      "simplifiedContent": "A simplified version using easier words and shorter sentences",
      "conciseSummary": "A brief 1-2 sentence summary",
      "detailedSummary": "A more detailed summary (3-5 sentences)",
      "keyTakeaways": ["point 1", "point 2", "point 3"]
    }`;

    // Use jsonModel for better JSON enforcement
    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse with cleaning
    try {
      const parsed = JSON.parse(cleanJsonString(text));
      return {
        simplifiedContent: parsed.simplifiedContent || generateMockSimplification(content),
        conciseSummary: parsed.conciseSummary || generateMockConciseSummary(content),
        detailedSummary: parsed.detailedSummary || generateMockDetailedSummary(content),
        keyTakeaways: parsed.keyTakeaways || generateMockKeyTakeaways(content),
      };
    } catch (parseError) {
      console.warn('Failed to parse Gemini simplification response as JSON');
      return {
        simplifiedContent: generateMockSimplification(content),
        conciseSummary: generateMockConciseSummary(content),
        detailedSummary: generateMockDetailedSummary(content),
        keyTakeaways: generateMockKeyTakeaways(content),
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API for simplification:', error);
    return {
      simplifiedContent: generateMockSimplification(content),
      conciseSummary: generateMockConciseSummary(content),
      detailedSummary: generateMockDetailedSummary(content),
      keyTakeaways: generateMockKeyTakeaways(content),
    };
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
  // Return first 50% of content
  const words = content.split(' ');
  return words.slice(0, Math.ceil(words.length / 2)).join(' ') + '...';
}

function generateMockKeyTakeaways(content) {
  // Extract key phrases
  const sentences = content.split('. ');
  return sentences.slice(0, 3).map((s) => {
    const words = s.split(' ');
    return words.slice(0, 5).join(' ');
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
  try {
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

    // Use jsonModel to enforce JSON structure
    const result = await jsonModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📤 [AI-SEARCH] Prompt sent to Gemini:', prompt);
    console.log('📥 [AI-SEARCH] Response from Gemini:', text);

    try {
      const parsed = JSON.parse(cleanJsonString(text));
      return {
        summary: parsed.summary || "Summary temporarily unavailable.",
        keyPoints: parsed.keyPoints || ["Details temporarily unavailable."]
      };
    } catch (parseError) {
      console.warn('Failed to parse Gemini chat response as JSON:', parseError);
      // Fallback: return the raw text if parsing fails, frontend will handle it as string
      return text.trim();
    }
  } catch (error) {
    console.error('Error calling Gemini API for chat:', error);
    return {
      summary: `I'm sorry, I couldn't process your question about "${word}" right now.`,
      keyPoints: ["Please try again later."]
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
