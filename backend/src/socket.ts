import http from "http";

import { Server } from "socket.io";

type JoinRoomPayload = {
  roomId: string;
};

type SignalPayload = {
  to: string;
  data: unknown;
};

const rooms = new Map<string, string[]>();
const socketToRoom = new Map<string, string>();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const removeSocketFromRoom = (socketId: string) => {
  const roomId = socketToRoom.get(socketId);

  if (!roomId) {
    return null;
  }

  const members = rooms.get(roomId) || [];
  const nextMembers = members.filter((memberId) => memberId !== socketId);

  if (nextMembers.length === 0) {
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, nextMembers);
  }

  socketToRoom.delete(socketId);

  return {
    roomId,
    remainingMembers: nextMembers,
  };
};

export const initSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("join-room", ({ roomId }: JoinRoomPayload) => {
      console.log(`[socket] join-room from ${socket.id} for room ${roomId}`);

      const existingRoom = socketToRoom.get(socket.id);
      if (existingRoom && existingRoom !== roomId) {
        const removed = removeSocketFromRoom(socket.id);
        if (removed) {
          console.log(
            `[socket] ${socket.id} left previous room ${removed.roomId} before joining ${roomId}`,
          );
        }
      }

      const members = rooms.get(roomId) || [];

      if (members.length >= 2) {
        console.log(`[socket] room-full for room ${roomId}; rejecting ${socket.id}`);
        socket.emit("room-full", { roomId });
        return;
      }

      if (!members.includes(socket.id)) {
        members.push(socket.id);
      }

      rooms.set(roomId, members);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(
        `[socket] room ${roomId} members after join: ${members.join(", ") || "(empty)"}`,
      );

      if (members.length === 2) {
        const existingPeerId = members.find((memberId) => memberId !== socket.id);

        if (existingPeerId) {
          console.log(
            `[socket] notifying ${existingPeerId} that ${socket.id} joined room ${roomId}`,
          );
          io.to(existingPeerId).emit("user-joined", socket.id);
        }
      }
    });

    socket.on("signal", ({ to, data }: SignalPayload) => {
      console.log(`[socket] signal relay from ${socket.id} to ${to}`);
      io.to(to).emit("signal", {
        from: socket.id,
        data,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnect: ${socket.id} (${reason})`);

      const removed = removeSocketFromRoom(socket.id);

      if (!removed) {
        return;
      }

      console.log(
        `[socket] ${socket.id} removed from room ${removed.roomId}; remaining: ${removed.remainingMembers.join(", ") || "(empty)"}`,
      );

      removed.remainingMembers.forEach((memberId) => {
        io.to(memberId).emit("user-left", socket.id);
      });
    });
  });

  return io;
};
