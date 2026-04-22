// import jwt from "jsonwebtoken";
import { createClient } from "redis";

// export function socketAuthMiddleware(secret) {
//   return (socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;
//       const user = jwt.verify(token, secret);
//       socket.user = user;
//       next();
//     } catch (err) {
//       next(new Error("Authentication error"));
//     }
//   };
// }

let clientsPromise;

function buildRedisUrl() {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;

  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  }

  return `redis://${host}:${port}`;
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
      console.log(`[Redis] Connected to ${url}`);
      return { pub, sub, isFallback: false };
    } catch (err) {
      console.error(`[Redis] Connection failed at ${url}:`, err.message);
      console.warn("[Redis] Using no-op fallback clients so services can still boot.");
      return createNoopClients();
    }
  })();

  return clientsPromise;
}
