import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const isHost = session?.user?.id === room.hostId;

    return NextResponse.json({ room, isHost });
  } catch (error: any) {
    console.error("GET /api/rooms/[slug]/details error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
