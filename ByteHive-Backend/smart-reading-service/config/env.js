import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.SMART_READING_PORT || 5008,
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://momina:WFbQgzM54N4G4yqT@cluster0.iuqggh8.mongodb.net/bytehive?retryWrites=true&w=majority&appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  aiProvider: process.env.AI_PROVIDER || 'mock', // mock, openai, or huggingface
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
};
