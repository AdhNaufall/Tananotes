import { connectDB } from "../../../../lib/mongodb";
import Note from "../../../../models/Note";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// GET - Fetch a single note by slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const note = await Note.findOne({ slug, ownerId: session.sub });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error fetching note by slug:", error);
    return NextResponse.json(
      { error: "Failed to fetch note", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
