import { PrismaClient } from "@prisma/client";
import { supabase, SUPABASE_BUCKET_NAME } from "../config/supabase";

const prisma = new PrismaClient();

export async function cleanupExpiredRooms() {
  try {
    const now = new Date();
    
    // Find rooms whose expiresAt has passed, OR never-joined rooms older than 2 hours
    const expiredRooms = await prisma.room.findMany({
      where: {
        OR: [
          {
            expiresAt: {
              lte: now,
            },
          },
          {
            expiresAt: null,
            createdAt: {
              lte: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: {
        callSessions: {
          include: {
            recordings: true,
          },
        },
      },
    });

    // Also check rooms with null expiresAt that were used in the past, but the last session was >1h ago
    const activeRoomsWithSessions = await prisma.room.findMany({
      where: {
        expiresAt: null,
      },
      include: {
        callSessions: {
          include: {
            recordings: true,
          },
        },
      },
    });

    const usedAndLeftRooms = activeRoomsWithSessions.filter((room) => {
      if (room.callSessions.length === 0) return false;
      const sorted = [...room.callSessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const lastSessionTime = sorted[0].createdAt;
      return new Date(lastSessionTime.getTime() + 60 * 60 * 1000) <= now;
    });

    const allExpiredRooms = [...expiredRooms, ...usedAndLeftRooms];

    if (allExpiredRooms.length === 0) {
      return;
    }

    console.log(`[cleanup] Found ${allExpiredRooms.length} expired rooms to delete.`);

    // Gather all recording file urls
    const fileUrls: string[] = [];
    for (const room of allExpiredRooms) {
      for (const session of room.callSessions) {
        for (const recording of session.recordings) {
          if (recording.fileUrl) {
            fileUrls.push(recording.fileUrl);
          }
        }
      }
    }

    // Delete files from Supabase Storage
    if (fileUrls.length > 0) {
      console.log(`[cleanup] Deleting ${fileUrls.length} files from Supabase Storage...`);
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .remove(fileUrls);
      if (error) {
        console.error("[cleanup] Error deleting files from Supabase Storage:", error);
      } else {
        console.log("[cleanup] Successfully deleted expired files from Supabase Storage.");
      }
    }

    // Delete rooms from Database (cascade delete will handle CallSession, Recording, and Invitation records)
    const expiredRoomIds = allExpiredRooms.map((room) => room.id);
    await prisma.room.deleteMany({
      where: {
        id: {
          in: expiredRoomIds,
        },
      },
    });

    console.log(`[cleanup] Successfully deleted ${expiredRoomIds.length} expired rooms from database.`);
  } catch (error) {
    console.error("[cleanup] Error during expired rooms cleanup:", error);
  }
}
