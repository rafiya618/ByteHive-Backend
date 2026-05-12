import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const parsedPort = Number(process.env.PORT);

export const PORT = process.env.PORT || 8000;
export const LISTEN_IP = process.env.LISTEN_IP || "0.0.0.0";
export const ANNOUNCED_IP = process.env.ANNOUNCED_IP || "127.0.0.1";