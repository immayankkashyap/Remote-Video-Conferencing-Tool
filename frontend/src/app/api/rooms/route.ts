import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabase, SUPABASE_BUCKET_NAME } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Clean up rooms whose expiresAt has passed, OR never-joined rooms older than 2 hours
    const expiredRooms = await prisma.room.findMany({
      where: {
        hostId: session.user.id,
        OR: [
          {
            expiresAt: {
              lte: now,
            },
          },
          {
            expiresAt: null,
            createdAt: {
              lte: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours of inactivity for never-joined rooms
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

    // 2. Also find rooms where expiresAt is null but they have been used in the past,
    // and the last session was created more than 1 hour ago (meaning they were used and left).
    const activeRoomsWithSessions = await prisma.room.findMany({
      where: {
        hostId: session.user.id,
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

    if (allExpiredRooms.length > 0) {
      const fileUrls: string[] = [];
      allExpiredRooms.forEach((room) => {
        room.callSessions.forEach((sess) => {
          sess.recordings.forEach((rec) => {
            if (rec.fileUrl) {
              fileUrls.push(rec.fileUrl);
            }
          });
        });
      });

      if (fileUrls.length > 0) {
        try {
          await supabase.storage.from(SUPABASE_BUCKET_NAME).remove(fileUrls);
        } catch (err) {
          console.error("Failed to delete expired files from Supabase Storage:", err);
        }
      }

      await prisma.room.deleteMany({
        where: {
          id: {
            in: allExpiredRooms.map((r) => r.id),
          },
        },
      });
    }

    // Only show rooms in "Your Studios" that have been left (expiresAt is not null) and have not expired yet
    const rooms = await prisma.room.findMany({
      where: {
        hostId: session.user.id,
        expiresAt: {
          not: null,
          gt: now,
        },
      },
      include: {
        callSessions: {
          include: {
            recordings: true,
          }
        },
      },
      orderBy: {
        id: "desc",
      }
    });

    // Check which videos are still available in the supabase bucket
    const { data: bucketFiles, error } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .list();

    if (!error && bucketFiles && bucketFiles.length > 0) {
      const bucketFileNames = new Set(bucketFiles.map(f => f.name));
      const recordingsToDelete: number[] = [];

      rooms.forEach(room => {
        room.callSessions.forEach(session => {
          session.recordings.forEach(rec => {
            // If the file is not in the bucket, mark it for deletion
            if (!bucketFileNames.has(rec.fileUrl)) {
              recordingsToDelete.push(rec.id);
            }
          });
        });
      });

      if (recordingsToDelete.length > 0) {
        // Remove from database
        await prisma.recording.deleteMany({
          where: { id: { in: recordingsToDelete } }
        });

        // Remove from the response object
        rooms.forEach(room => {
          room.callSessions.forEach(session => {
            session.recordings = session.recordings.filter(rec => !recordingsToDelete.includes(rec.id));
          });
        });
      }
    }

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    // Generate unique slug
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}-${random}`;

    const newRoom = await prisma.room.create({
      data: {
        name,
        slug,
        hostId: session.user.id,
      },
    });

    return NextResponse.json({ room: newRoom });
  } catch (error: any) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
