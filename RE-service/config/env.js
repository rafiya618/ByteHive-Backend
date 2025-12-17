// Instruction Notes:
// - Implements environment configuration for shared ByteHive DB connection (Requirement: use same database)
// - Reads MongoDB Atlas URI and service port from .env

import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  MONGO_URI: process.env.MONGO_URI || "",
  PORT: process.env.PORT ? Number(process.env.PORT) : 7105,
  // Instruction Notes:
  // - Loosely coupled services: fetch posts/communities via their HTTP APIs
  //   Set full base URLs including route prefixes, e.g. http://localhost:7101/api/posts
  POSTS_SERVICE_URL: process.env.POSTS_SERVICE_URL || "",
  COMMUNITIES_SERVICE_URL: process.env.COMMUNITIES_SERVICE_URL || "",
};

if (!ENV.MONGO_URI) {
  console.warn(
    "[RE-service] Warning: MONGO_URI is empty. Set it in RE-service/.env to connect to ByteHive cluster."
  );
}

if (!ENV.POSTS_SERVICE_URL || !ENV.COMMUNITIES_SERVICE_URL) {
  console.warn(
    "[RE-service] Warning: POSTS_SERVICE_URL or COMMUNITIES_SERVICE_URL not set. Ranking/enrichment will call those services; please set the full URLs."
  );
}
