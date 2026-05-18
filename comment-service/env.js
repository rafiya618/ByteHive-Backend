import dotenv from "dotenv";

dotenv.config();

export const SOCKET_GATEWAY_URL =
  process.env.SOCKET_GATEWAY_URL || "http://localhost:4000";import dotenv from "dotenv";

dotenv.config();

export function getRequiredUrl(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`[comment-service] Missing required environment variable: ${name}`);
  }

  return value;
}