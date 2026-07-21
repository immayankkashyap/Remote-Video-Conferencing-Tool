import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    const room = await prisma.room.findUnique({
      where: { slug },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Only host can start a session to prevent guest abuse
    if (session?.user?.id !== room.hostId) {
      return NextResponse.json({ error: "Only the host can start a session." }, { status: 403 });
    }

    const callSession = await prisma.callSession.create({
      data: {
        roomId: room.id,
      },
    });

    return NextResponse.json({ sessionId: callSession.id });
  } catch (error: any) {
    console.error("POST /api/rooms/[slug]/session error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
