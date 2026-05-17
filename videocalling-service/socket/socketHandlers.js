import { LISTEN_IP, ANNOUNCED_IP } from "../config.js";

export default function registerSocketHandlers(io, worker) {
  // Store chat messages in-memory, per room
  const inCallChats = new Map(); // roomId -> array of { socketId, senderName, message, ts }
  // Store mediasoup routers, transports, producers, consumers per room
  const rooms = new Map(); // roomId -> { router, transports, producers, consumers, members }

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // --- In-Call Chat: send + history ---
    socket.on("call:chat-message", ({ roomId, message, senderName }) => {
      if (!inCallChats.has(roomId)) inCallChats.set(roomId, []);
      const chatLog = inCallChats.get(roomId);
      const msg = {
        socketId: socket.id,
        senderName: senderName || socket.data?.displayName || socket.id,
        message,
        ts: Date.now()
      };
      chatLog.push(msg);
      io.to(roomId).emit("call:chat-message", msg);
    });

    // 1. Join Room
    socket.on("join-room", async ({ roomId, displayName }, callback) => {
      try {
        socket.data.displayName = displayName || socket.data.displayName || socket.id;
        // Create room if not exists
        if (!rooms.has(roomId)) {
          const router = await worker.createRouter({ mediaCodecs: [
            { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
            { kind: "video", mimeType: "video/VP8", clockRate: 90000 }
          ] });
          rooms.set(roomId, {
            router,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
            members: new Map()
          });
        }
        const room = rooms.get(roomId);
        if (!room.members.has(socket.id)) {
          room.members.set(socket.id, { transports: [], producers: [], displayName: socket.data.displayName });
        } else {
          const member = room.members.get(socket.id);
          member.displayName = socket.data.displayName;
        }
        socket.join(roomId);
        socket.to(roomId).emit("peer-joined", { socketId: socket.id, displayName: socket.data.displayName });
        const existingProducers = [...room.producers.values()]
          .filter(p => p.ownerSocketId !== socket.id)
          .map(p => ({
            id: p.producer.id,
            kind: p.kind,
            ownerSocketId: p.ownerSocketId,
            ownerDisplayName: p.ownerDisplayName || room.members.get(p.ownerSocketId)?.displayName || p.ownerSocketId
          }));
        const chatHistory = inCallChats.get(roomId) || [];
        callback({
          routerRtpCapabilities: room.router.rtpCapabilities,
          existingProducers,
          chatHistory
        });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 2. Create Transport
    socket.on("create-transport", async ({ roomId }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "join-room first" });
        const member = room.members.get(socket.id);
        if (!member) return callback({ error: "join-room first" });
        const transport = await room.router.createWebRtcTransport({
          listenIps: [{ ip: LISTEN_IP, announcedIp: ANNOUNCED_IP }],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        });
        room.transports.set(transport.id, { transport, ownerSocketId: socket.id });
        member.transports.push(transport.id);
        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 3. Connect Transport
    socket.on("connect-transport", async ({ roomId, transportId, dtlsParameters }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "room not found" });
        const tEntry = room.transports.get(transportId);
        if (!tEntry) throw new Error("transport not found");
        await tEntry.transport.connect({ dtlsParameters });
        callback({ ok: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 4. Produce
    socket.on("produce", async ({ roomId, transportId, kind, rtpParameters }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "room not found" });
        const tEntry = room.transports.get(transportId);
        if (!tEntry) throw new Error("transport not found");
        const producer = await tEntry.transport.produce({ kind, rtpParameters });
        room.producers.set(producer.id, {
          producer,
          ownerSocketId: socket.id,
          ownerDisplayName: room.members.get(socket.id)?.displayName || socket.data?.displayName || socket.id,
          kind
        });
        const member = room.members.get(socket.id);
        if (member) member.producers.push(producer.id);
        socket.to(roomId).emit("new-producer", {
          producerId: producer.id,
          kind,
          ownerSocketId: socket.id,
          ownerDisplayName: room.members.get(socket.id)?.displayName || socket.data?.displayName || socket.id
        });
        const closeProducer = () => {
          room.producers.delete(producer.id);
          io.to(roomId).emit("producer-closed", { producerId: producer.id });
        };
        producer.on("transportclose", closeProducer);
        producer.on("close", closeProducer);
        callback({ id: producer.id });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 5. Consume
    socket.on("consume", async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "room not found" });
        const router = room.router;
        if (!router.canConsume({ producerId, rtpCapabilities })) return callback({ error: "cannot consume" });
        const tEntry = room.transports.get(transportId);
        if (!tEntry) throw new Error("transport not found");
        const producerInfo = room.producers.get(producerId);
        if (!producerInfo) return callback({ error: "producer not found" });
        const consumer = await tEntry.transport.consume({
          producerId,
          rtpCapabilities,
          paused: true,
        });
        room.consumers.set(consumer.id, { consumer, ownerSocketId: socket.id });
        consumer.on("transportclose", () => room.consumers.delete(consumer.id));
        consumer.on("producerclose", () => {
          room.consumers.delete(consumer.id);
          socket.emit("producer-closed", { producerId });
        });
        callback({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          ownerSocketId: producerInfo.ownerSocketId,
          ownerDisplayName: producerInfo.ownerDisplayName || room.members.get(producerInfo.ownerSocketId)?.displayName || producerInfo.ownerSocketId,
        });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 6. Resume Consumer
    socket.on("resume-consumer", async ({ roomId, consumerId }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "room not found" });
        const cEntry = room.consumers.get(consumerId);
        if (!cEntry) return callback({ error: "consumer not found" });
        await cEntry.consumer.resume();
        callback({ ok: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 7. Pause/Resume Producer (mute/unmute)
    socket.on("pause-producer", async ({ roomId, producerId }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "room not found" });
        const pEntry = room.producers.get(producerId);
        if (!pEntry || pEntry.ownerSocketId !== socket.id)
          return callback({ error: "producer not found or not owned" });
        await pEntry.producer.pause();
        socket.to(roomId).emit("producer-paused", { producerId });
        callback({ ok: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    socket.on("resume-producer", async ({ roomId, producerId }, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return callback({ error: "room not found" });
        const pEntry = room.producers.get(producerId);
        if (!pEntry || pEntry.ownerSocketId !== socket.id)
          return callback({ error: "producer not found or not owned" });
        await pEntry.producer.resume();
        socket.to(roomId).emit("producer-resumed", { producerId });
        callback({ ok: true });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // 8. Leave Room
    socket.on("leave-room", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;
      (member.producers || []).forEach((pid) => {
        const pEntry = room.producers.get(pid);
        if (pEntry && pEntry.producer) pEntry.producer.close();
        room.producers.delete(pid);
      });
      (member.transports || []).forEach((tid) => {
        const tEntry = room.transports.get(tid);
        if (tEntry && tEntry.transport) tEntry.transport.close();
        room.transports.delete(tid);
      });
      room.members.delete(socket.id);
      socket.to(roomId).emit("peer-left", { socketId: socket.id });
      socket.leave(roomId);
      if (room.members.size === 0) {
        rooms.delete(roomId);
        inCallChats.delete(roomId);
      }
    });

    // 9. Disconnect = auto-leave all rooms
    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        if (!room.members.has(socket.id)) continue;
        const member = room.members.get(socket.id);
        (member.producers || []).forEach((pid) => {
          const pEntry = room.producers.get(pid);
          if (pEntry && pEntry.producer) pEntry.producer.close();
          room.producers.delete(pid);
        });
        (member.transports || []).forEach((tid) => {
          const tEntry = room.transports.get(tid);
          if (tEntry && tEntry.transport) tEntry.transport.close();
          room.transports.delete(tid);
        });
        room.members.delete(socket.id);
        socket.to(roomId).emit("peer-left", { socketId: socket.id });
        if (room.members.size === 0) {
          rooms.delete(roomId);
          inCallChats.delete(roomId);
        }
      }
    });
  });
}
