import { createClient } from "redis";

let clientsPromise;

function buildRedisUrl() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required in environment variables");
  }
  return process.env.REDIS_URL;
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