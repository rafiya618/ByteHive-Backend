import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.SMART_READING_PORT || 5008,
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://momina:WFbQgzM54N4G4yqT@cluster0.iuqggh8.mongodb.net/bytehive?retryWrites=true&w=majority&appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY,
  // Cache configuration - toggle caching of AI simplification responses
  enableSimplificationCache: process.env.ENABLE_SIMPLIFICATION_CACHE === 'true',
};
