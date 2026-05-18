import dotenv from "dotenv";

dotenv.config();

export const SOCKET_GATEWAY_URL =
  process.env.SOCKET_GATEWAY_URL || "http://localhost:4000";