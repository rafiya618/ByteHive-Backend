import { Server } from "socket.io";
import { createRedisClients } from "./redisClient.js";

export const setupSocket = async (server) => {
  const io = new Server(server, { cors: { origin: "*" } });

  // Redis setup
  const { sub } = await createRedisClients();

  // Socket.IO handlers
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", ({ type, id }) => {
      const roomKey = `${type}:${id}`;
      socket.join(roomKey);
      console.log(`📌 ${socket.id} joined room ${roomKey}`);
    });

    socket.on("leaveRoom", ({ type, id }) => {
      const roomKey = `${type}:${id}`;
      socket.leave(roomKey);
      console.log(`📌 ${socket.id} left room ${roomKey}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

    socket.on("forward:event", ({ type, data }) => {
      console.log("📢 [GATEWAY] Received forward:event:", type, "to", data.receiverId);

      const eventName = type.split(":")[0];

      if (eventName == "comment") {
        console.log("📢 [GATEWAY] Broadcasting to post room:", `post:${data.postId}`);
        io.to(`post:${data.postId}`).emit(type, data);
      }

      if (eventName == "notification") {
        const targetRoom = `user:${data.receiverId?.toString()}`;
        console.log("📢 [GATEWAY] Broadcasting to user room:", targetRoom);
        io.to(targetRoom).emit(type, data);
      }
    })
  });

  return io;
};
