import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabase, SUPABASE_BUCKET_NAME } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const recording = await prisma.recording.findUnique({
      where: { id: Number(id) },
      include: {
        session: {
          include: {
            room: true,
          }
        }
      }
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Verify the user is the host of the room where this recording took place
    if (recording.session.room.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You are not the host of this room." }, { status: 403 });
    }

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .createSignedUrl(recording.fileUrl, 60); // 60 seconds expiry

    if (error || !data || !data.signedUrl) {
      console.error("Supabase createSignedUrl error:", error);
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error: any) {
    console.error("GET /api/recordings/[id]/download error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
