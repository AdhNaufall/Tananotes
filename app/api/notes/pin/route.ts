import { connectDB } from "../../../../lib/mongodb";
import Note from "../../../../models/Note";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// PATCH - Toggle pin status
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
    }

    // Get current note
    const note = await Note.findOne({ _id: id, ownerId: session.sub });
    
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Toggle isPinned
    note.isPinned = !note.isPinned;
    await note.save();

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error toggling pin status:", error);
    return NextResponse.json(
      { error: "Failed to toggle pin status", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}
