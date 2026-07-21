import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, email } = await req.json();
    if (!roomId || !email) {
      return NextResponse.json({ error: "Missing roomId or email" }, { status: 400 });
    }

    // Verify room exists and user is host
    const room = await prisma.room.findUnique({
      where: { slug: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized, must be host" }, { status: 403 });
    }

    // Check if user exists
    const invitee = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitee) {
      return NextResponse.json({ error: "No user found with that email. Please copy and share the Guest Link instead!" }, { status: 404 });
    }

    // Check for duplicate pending invite
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        roomId: room.id,
        inviteeEmail: email,
        status: "PENDING"
      }
    });

    if (existingInvite) {
      return NextResponse.json({ error: "Invite already pending" }, { status: 400 });
    }

    // Create invite
    const invitation = await prisma.invitation.create({
      data: {
        roomId: room.id,
        senderId: session.user.id,
        inviteeEmail: email,
      },
      include: {
        room: true,
        sender: true
      }
    });

    return NextResponse.json({ invitation });
  } catch (error: any) {
    console.error("POST /api/invitations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        inviteeEmail: session.user.email,
        status: "PENDING"
      },
      include: {
        room: true,
        sender: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error("GET /api/invitations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
