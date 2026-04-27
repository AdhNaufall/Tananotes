import { connectDB } from "../../../../../lib/mongodb";
import Note from "../../../../../models/Note";
import NoteVersion from "../../../../../models/NoteVersion";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

async function getNoteAndVersions(slug: string, ownerId: string) {
  const note = await Note.findOne({ slug, ownerId });
  if (!note) {
    return { note: null, versions: [] };
  }

  const versions = await NoteVersion.find({ ownerId, noteId: note._id.toString() })
    .sort({ createdAt: -1 })
    .limit(10);

  return { note, versions };
}

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
    const { note, versions } = await getNoteAndVersions(slug, session.sub);

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching note versions:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.sub;

    const { slug } = await params;
    const { versionId } = await request.json();

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    const note = await Note.findOne({ slug, ownerId });
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const version = await NoteVersion.findOne({ _id: versionId, ownerId, noteId: note._id.toString() });
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    await NoteVersion.create({
      ownerId,
      noteId: note._id.toString(),
      noteSlug: note.slug,
      title: note.title,
      category: note.category,
      content: note.content,
      slug: note.slug,
      color: note.color,
      isPinned: note.isPinned,
    });

    const updatedNote = await Note.findByIdAndUpdate(
      note._id,
      {
        title: version.title,
        category: version.category,
        content: version.content,
        slug: version.slug,
        color: version.color,
        isPinned: version.isPinned,
        updatedAt: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!updatedNote) {
      return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
    }

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Error restoring note version:', error);
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}