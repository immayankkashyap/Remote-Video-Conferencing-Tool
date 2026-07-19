import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
