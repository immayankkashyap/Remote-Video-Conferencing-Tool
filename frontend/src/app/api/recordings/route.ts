import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { sessionId, participantName, fileUrl } = await req.json();

    if (!sessionId || !participantName || !fileUrl) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const recording = await prisma.recording.create({
      data: {
        sessionId,
        participantName,
        fileUrl,
      },
    });

    return NextResponse.json({ recording });
  } catch (error: any) {
    console.error("POST /api/recordings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
