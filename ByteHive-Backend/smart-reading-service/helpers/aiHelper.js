import { config } from '../config/env.js';

// Mock data for demonstration
const mockMeanings = {
  'next.js': {
    word: 'Next.js',
    definition: 'A powerful React framework that enables server-side rendering and static site generation for building modern web applications.',
    pronunciation: '/ˈnekst dɒt dʒeɪ es/',
    partOfSpeech: 'noun',
    examples: [
      'We built our application using Next.js for better performance.',
      'Next.js provides built-in API routes for backend functionality.',
    ],
    synonyms: ['React framework', 'SSR framework'],
    antonyms: [],
  },
  react: {
    word: 'React',
    definition: 'A JavaScript library for building user interfaces with reusable components and state management.',
    pronunciation: '/riːˈækt/',
    partOfSpeech: 'noun',
    examples: [
      'React components are reusable and composable.',
      'The virtual DOM in React makes updates efficient.',
    ],
    synonyms: ['UI library', 'Component library'],
    antonyms: [],
  },
  typescript: {
    word: 'TypeScript',
    definition: 'A typed superset of JavaScript that compiles to plain JavaScript, adding static type checking and better tooling support.',
    pronunciation: '/ˈtaɪpˌskrɪpt/',
    partOfSpeech: 'noun',
    examples: [
      'TypeScript catches type errors at compile time.',
      'Using TypeScript improves code maintainability.',
    ],
    synonyms: ['Typed JavaScript', 'Static typing'],
    antonyms: [],
  },
};

export async function getMeaningFromAI(word) {
  const lowerWord = word.toLowerCase();

  // Check mock data first
  if (mockMeanings[lowerWord]) {
    return mockMeanings[lowerWord];
  }

  // If using real AI providers
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

async function getOpenAIMeaning(word) {
  // Placeholder for OpenAI integration
  // In production, integrate with OpenAI API
  console.log('🔄 OpenAI integration placeholder for:', word);
  return mockMeanings[word.toLowerCase()] || {
    word,
    definition: `AI-generated definition for ${word}`,
  };
}

export async function simplifyContentWithAI(content, level = 'detailed') {
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

function generateMockSimplification(content) {
  // Remove complex sentences and simplify
  const sentences = content.split('. ');
  return sentences
    .map((sentence) => simplifysentence(sentence.trim()))
    .join('. ');
}

function simplifysentence(sentence) {
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

export async function findRelatedBlogs(keyword, allPosts = []) {
  // Filter posts by keyword relevance
  const searchTerm = keyword.toLowerCase();
  
  const relatedPosts = allPosts
    .filter((post) => {
      const title = (post.post_title || '').toLowerCase();
      const description = (post.post_description || '').toLowerCase();
      return title.includes(searchTerm) || description.includes(searchTerm);
    })
    .slice(0, 3)
    .map((post) => ({
      postId: post._id || post.id,
      title: post.post_title,
      snippet: (post.post_description || '').substring(0, 100) + '...',
      readTime: post.read_time || '5 min',
      relevanceScore: calculateRelevance(post, searchTerm),
      thumbnail: post.thumbnail,
      author: post.author?.name || 'Unknown',
    }));

  return relatedPosts;
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
