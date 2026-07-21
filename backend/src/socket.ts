import http from "http";

import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type JoinRoomPayload = {
  roomId: string;
  username?: string;
};

type SignalPayload = {
  to: string;
  data: unknown;
};

const rooms = new Map<string, string[]>();
const socketToRoom = new Map<string, string>();
const socketToUsername = new Map<string, string>();
const socketToEmail = new Map<string, string>();
const emailToSocket = new Map<string, string>();

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

    socket.on("join-room", ({ roomId, username }: JoinRoomPayload) => {
      console.log(`[socket] join-room from ${socket.id} (${username || "anonymous"}) for room ${roomId}`);

      socketToUsername.set(socket.id, username || "Guest");

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
            const existingPeerUsername = socketToUsername.get(existingPeerId) || "Guest";
            console.log(
              `[socket] notifying ${existingPeerId} that ${socket.id} (${username || "Guest"}) joined room ${roomId}`,
            );
            // Notify existing peer of new peer's info
            io.to(existingPeerId).emit("user-joined", {
              id: socket.id,
              username: username || "Guest",
            });
            // Notify joining peer of existing peer's info
            socket.emit("peer-info", {
              id: existingPeerId,
              username: existingPeerUsername,
            });
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

    socket.on("host-start-recording", async ({ roomId, userId, sessionId }) => {
      console.log(`[socket] host-start-recording request from ${socket.id} (user ${userId}) for room ${roomId}`);
      try {
        const room = await prisma.room.findUnique({
          where: { slug: roomId },
          select: { hostId: true }
        });
        
        if (room && room.hostId === userId) {
          console.log(`[socket] verified host for room ${roomId}, broadcasting start-recording-trigger`);
          io.to(roomId).emit("start-recording-trigger", { sessionId });
        } else {
          console.warn(`[socket] unauthorized host-start-recording attempt by ${userId} for room ${roomId}`);
        }
      } catch (error) {
        console.error(`[socket] error verifying host:`, error);
      }
    });

    socket.on("host-stop-recording", async ({ roomId, userId }) => {
      console.log(`[socket] host-stop-recording request from ${socket.id} (user ${userId}) for room ${roomId}`);
      try {
        const room = await prisma.room.findUnique({
          where: { slug: roomId },
          select: { hostId: true }
        });
        
        if (room && room.hostId === userId) {
          console.log(`[socket] verified host for room ${roomId}, broadcasting stop-recording-trigger`);
          io.to(roomId).emit("stop-recording-trigger");
        } else {
          console.warn(`[socket] unauthorized host-stop-recording attempt by ${userId} for room ${roomId}`);
        }
      } catch (error) {
        console.error(`[socket] error verifying host:`, error);
      }
    });

    socket.on("dashboard-connect", ({ email }: { email: string }) => {
      if (email) {
        console.log(`[socket] dashboard-connect: ${email} -> ${socket.id}`);
        socketToEmail.set(socket.id, email);
        emailToSocket.set(email, socket.id);
      }
    });

    socket.on("notify-invite", ({ inviteeEmail, inviteData }: { inviteeEmail: string, inviteData: any }) => {
      console.log(`[socket] notify-invite for ${inviteeEmail}`);
      const targetSocketId = emailToSocket.get(inviteeEmail);
      if (targetSocketId) {
        io.to(targetSocketId).emit("incoming-invite", inviteData);
      } else {
        console.log(`[socket] user ${inviteeEmail} not online`);
      }
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

      const email = socketToEmail.get(socket.id);
      if (email) {
        emailToSocket.delete(email);
        socketToEmail.delete(socket.id);
      }

      removed.remainingMembers.forEach((memberId) => {
        io.to(memberId).emit("user-left", socket.id);
      });
    });
  });

  return io;
};
