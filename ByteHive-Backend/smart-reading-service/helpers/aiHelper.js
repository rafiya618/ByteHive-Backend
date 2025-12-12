import { config } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function getMeaningFromAI(word) {
  try {
    // Try dictionary API first for real data
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) throw new Error('Word not found in dictionary');

    const data = await response.json();
    const entry = data[0];

    const meaning = entry.meanings[0];
    const definition = meaning.definitions[0].definition;
    const partOfSpeech = meaning.partOfSpeech;
    const pronunciation = entry.phonetics?.find(p => p.text)?.text || `/${word}/`;
    const examples = meaning.definitions.slice(0, 2).map(d => d.example || `Example sentence with ${word}.`).filter(Boolean);
    const synonyms = meaning.synonyms?.slice(0, 5) || [];

    return {
      word: entry.word,
      definition,
      pronunciation,
      partOfSpeech,
      examples,
      synonyms,
      antonyms: meaning.antonyms?.slice(0, 3) || [],
    };
  } catch (error) {
    console.log('Dictionary API failed, falling back to Gemini:', error.message);
    // Fallback to Gemini AI
    if (config.aiProvider === 'gemini' && config.geminiApiKey) {
      return await getGeminiMeaning(word);
    }

    // If using other AI providers
    if (config.aiProvider === 'openai' && config.openaiApiKey) {
      return await getOpenAIMeaning(word);
    }

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
    const prompt = `Provide a detailed definition for the word "${word}" in the following JSON format:
    {
      "word": "${word}",
      "definition": "A clear, comprehensive definition",
      "pronunciation": "Phonetic pronunciation in IPA format",
      "partOfSpeech": "noun/verb/adjective/etc",
      "examples": ["Example sentence 1", "Example sentence 2"],
      "synonyms": ["synonym1", "synonym2"],
      "antonyms": ["antonym1", "antonym2"]
    }
    
    Make sure the response is valid JSON. If you don't know the word, provide a reasonable definition based on context.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(text);
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
      // If JSON parsing fails, extract information from text
      console.warn('Failed to parse Gemini response as JSON, using fallback');
      return {
        word,
        definition: text.split('.')[0] || `Definition for ${word}`,
        pronunciation: `/${word}/`,
        partOfSpeech: 'noun',
        examples: [`Example with ${word}`],
        synonyms: [],
        antonyms: [],
      };
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
    const prompt = `Simplify the following text and provide the response in JSON format:

Text to simplify:
${content}

Please provide:
1. simplifiedContent: A simplified version of the text using easier words and shorter sentences
2. conciseSummary: A brief 1-2 sentence summary
3. detailedSummary: A more detailed summary (3-5 sentences)
4. keyTakeaways: An array of 3-5 bullet points with the main points

Response format:
{
  "simplifiedContent": "simplified text here",
  "conciseSummary": "brief summary",
  "detailedSummary": "detailed summary",
  "keyTakeaways": ["point 1", "point 2", "point 3"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const parsed = JSON.parse(text);
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
  if (config.aiProvider === 'gemini' && config.geminiApiKey) {
    return await chatWithGemini(word, userMessage);
  }

  // Mock response
  return `I understand you're asking about "${word}". ${userMessage} - This is a mock response. Please integrate with a real AI provider.`;
}

async function chatWithGemini(word, userMessage) {
  try {
    const prompt = `You are a helpful AI assistant specializing in explaining concepts related to "${word}". 

User's question: "${userMessage}"

Please provide a helpful, accurate response about "${word}" that addresses the user's question. Format your response as:

1. A brief 2-line summary
2. Key bullet points with important details

Keep your entire response concise and focused on the most relevant information.

Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error('Error calling Gemini API for chat:', error);
    return `I'm sorry, I couldn't process your question about "${word}" right now. Please try again later.`;
  }
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
