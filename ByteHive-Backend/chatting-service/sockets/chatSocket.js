export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", ({ room_id, user_id }) => {
      socket.join(room_id);
      io.to(room_id).emit("room_joined", { room_id, user_id });
    });

    socket.on("join_thread", ({ thread_id, user_id }) => {
      socket.join(thread_id);
      io.to(thread_id).emit("thread_joined", { thread_id, user_id });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
