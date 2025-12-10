import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from local .env first, then fallback to shared-config
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../shared-config/.env') });
