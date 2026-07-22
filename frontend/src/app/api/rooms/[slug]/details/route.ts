import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabase, SUPABASE_BUCKET_NAME } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    const room = await prisma.room.findUnique({
      where: { slug },
      include: {
        host: {
          select: { name: true, email: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    let isExpired = false;
    const now = new Date();
    if (room.expiresAt && room.expiresAt <= now) {
      isExpired = true;
    } else if (!room.expiresAt) {
      if (room.createdAt <= new Date(now.getTime() - 2 * 60 * 60 * 1000)) {
        isExpired = true;
      } else {
        const callSessions = await prisma.callSession.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: "desc" }
        });
        if (callSessions.length > 0 && new Date(callSessions[0].createdAt.getTime() + 60 * 60 * 1000) <= now) {
          isExpired = true;
        }
      }
    }

    if (isExpired) {
      const fileUrls: string[] = [];
      const callSessions = await prisma.callSession.findMany({
        where: { roomId: room.id },
        include: { recordings: true }
      });
      callSessions.forEach(sess => {
        sess.recordings.forEach(rec => {
          if (rec.fileUrl) fileUrls.push(rec.fileUrl);
        });
      });
      if (fileUrls.length > 0) {
        try {
          await supabase.storage.from(SUPABASE_BUCKET_NAME).remove(fileUrls);
        } catch (err) {
          console.error("Failed to delete expired files from Supabase Storage:", err);
        }
      }
      await prisma.room.delete({ where: { id: room.id } });
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isHost = session?.user?.id === room.hostId;

    return NextResponse.json({ room, isHost });
  } catch (error: any) {
    console.error("GET /api/rooms/[slug]/details error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
