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

export async function createRedisClients() {
  const pub = createClient({ url: "redis://localhost:6379" });
  const sub = createClient({ url: "redis://localhost:6379" });
  await pub.connect();
  await sub.connect();
  return { pub, sub };
}
