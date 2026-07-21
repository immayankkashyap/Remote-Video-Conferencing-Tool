import { PrismaClient } from "@prisma/client";
import { supabase, SUPABASE_BUCKET_NAME } from "../config/supabase";

const prisma = new PrismaClient();

export async function cleanupExpiredRooms() {
  try {
    const now = new Date();
    // Find all rooms that have expired
    const expiredRooms = await prisma.room.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
      include: {
        callSessions: {
          include: {
            recordings: true,
          },
        },
      },
    });

    if (expiredRooms.length === 0) {
      return;
    }

    console.log(`[cleanup] Found ${expiredRooms.length} expired rooms to delete.`);

    // Gather all recording file urls
    const fileUrls: string[] = [];
    for (const room of expiredRooms) {
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
    const expiredRoomIds = expiredRooms.map((room) => room.id);
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
