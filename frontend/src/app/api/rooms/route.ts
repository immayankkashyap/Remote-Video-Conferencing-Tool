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

    const rooms = await prisma.room.findMany({
      where: {
        hostId: session.user.id,
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
