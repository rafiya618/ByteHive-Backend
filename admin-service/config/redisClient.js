import { createClient } from "redis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

let clientsPromise;

function buildRedisUrl() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("[Redis] REDIS_URL is missing; using fallback clients.");
    return null;
  }

  return redisUrl;
}

function createNoopClients() {
  const noop = async () => {};

  return {
    pub: {
      publish: async () => 0,
      quit: noop,
      disconnect: noop,
      on: () => {},
    },
    sub: {
      subscribe: noop,
      unsubscribe: noop,
      quit: noop,
      disconnect: noop,
      on: () => {},
    },
    isFallback: true,
  };
}

export async function createRedisClients() {
  if (clientsPromise) return clientsPromise;

  clientsPromise = (async () => {
    const url = buildRedisUrl();

    if (!url) {
      return createNoopClients();
    }

    const pub = createClient({
      url,
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
        reconnectStrategy: (retries) => Math.min(retries * 200, 2000),
      },
    });

    const sub = pub.duplicate();

    pub.on("error", (err) => {
      console.error("[Redis pub]", err.message);
    });

    sub.on("error", (err) => {
      console.error("[Redis sub]", err.message);
    });

    try {
      await Promise.all([pub.connect(), sub.connect()]);
      console.log(`[Redis] Connected`);
      return { pub, sub, isFallback: false };
    } catch (err) {
      console.error(`[Redis] Connection failed:`, err.message);
      console.warn("[Redis] Using fallback clients.");
      return createNoopClients();
    }
  })();

  return clientsPromise;
}