import { connectDB } from "../../../lib/mongodb";
import Note from "../../../models/Note";
import NoteVersion from "../../../models/NoteVersion";
import { NextResponse } from "next/server";
import type { SortOrder } from "mongoose";
import { getSessionFromRequest } from "@/lib/auth";

type SortValue = SortOrder | { $meta: 'textScore' };
type SortSpec = Record<string, SortValue>;

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildSearchTerms(search: string) {
  const terms = search
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const uniqueTerms = Array.from(new Set(terms.map((t) => t.toLowerCase())));
  return uniqueTerms;
}

function highlightText(input: string, terms: string[]) {
  const safe = escapeHtml(input);
  if (terms.length === 0) return safe;

  const pattern = terms.map(escapeRegex).join('|');
  if (!pattern) return safe;

  const regex = new RegExp(`(${pattern})`, 'gi');
  return safe.replace(regex, '<mark class="bg-yellow-300 px-0.5 rounded">$1</mark>');
}

function buildSnippet(input: string, terms: string[]) {
  const text = stripHtml(input);
  if (!text) return '';

  if (terms.length === 0) {
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  }

  const lower = text.toLowerCase();
  let firstIndex = -1;

  for (const term of terms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
      firstIndex = idx;
    }
  }

  if (firstIndex === -1) {
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  }

  const start = Math.max(0, firstIndex - 70);
  const end = Math.min(text.length, firstIndex + 110);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

async function buildUniqueSlug(baseTitle: string, ownerId: string, excludeId?: string) {
  const baseSlug = baseTitle.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'untitled';

  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await Note.findOne({
      ownerId,
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select('_id');

    if (!existing) return candidate;

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

// GET - Fetch all notes from MongoDB (with optional search + filters)
export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.sub;

    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get('search') || '').trim();
    const category    = searchParams.get('category');
    const pinned      = searchParams.get('pinned');
    const dateFrom    = searchParams.get('dateFrom');
    const dateTo      = searchParams.get('dateTo');
    const sortByParam = searchParams.get('sortBy');
    const useTextSearch = searchQuery.length > 0;
    const sortBy = sortByParam || (useTextSearch ? 'relevance' : 'newest');

    const query: Record<string, unknown> = { ownerId, isDeleted: { $ne: true } };

    if (useTextSearch) {
      query.$text = { $search: searchQuery };
    }

    if (category) {
      query.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
    }

    if (pinned === 'true') {
      query.isPinned = true;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo)   dateFilter.$lte = new Date(dateTo);
      query.createdAt = dateFilter;
    }

    const sortMap: Record<string, SortSpec> = {
      relevance: { score: { $meta: 'textScore' }, isPinned: -1, createdAt: -1 },
      newest:  { isPinned: -1, createdAt: -1 },
      oldest:  { isPinned: -1, createdAt:  1 },
      updated: { isPinned: -1, updatedAt: -1 },
      az:      { title:  1 },
      za:      { title: -1 },
    };
    const sort = sortMap[sortBy] ?? (useTextSearch ? sortMap.relevance : sortMap.newest);

    const projection = useTextSearch ? { score: { $meta: 'textScore' as const } } : undefined;

    let notes;
    try {
      notes = await Note.find(query, projection).sort(sort).lean();
    } catch (error) {
      if (!useTextSearch) {
        throw error;
      }

      const fallbackQuery: Record<string, unknown> = { ...query };
      delete fallbackQuery.$text;
      fallbackQuery.$or = [
        { title: { $regex: escapeRegex(searchQuery), $options: 'i' } },
        { content: { $regex: escapeRegex(searchQuery), $options: 'i' } },
        { category: { $regex: escapeRegex(searchQuery), $options: 'i' } },
      ];

      const fallbackSort = sortBy === 'relevance' ? sortMap.newest : sort;
      notes = await Note.find(fallbackQuery).sort(fallbackSort).lean();
    }

    if (!useTextSearch) {
      return NextResponse.json(notes);
    }

    const terms = buildSearchTerms(searchQuery);
    const withHighlights = notes.map((note) => {
      const title = typeof note.title === 'string' ? note.title : '';
      const cat = typeof note.category === 'string' ? note.category : '';
      const content = typeof note.content === 'string' ? note.content : '';

      return {
        ...note,
        searchHighlights: {
          title: highlightText(title, terms),
          category: highlightText(cat, terms),
          snippet: highlightText(buildSnippet(content, terms), terms),
        },
      };
    });

    return NextResponse.json(withHighlights);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST - Save new note to MongoDB
export async function POST(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.sub;

    const { title, category, content, color = '#ffffff', isPinned = false } = await request.json();

    const slug = await buildUniqueSlug(title, ownerId);

    const newNote = await Note.create({ ownerId, title, category, content, slug, color, isPinned });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error("Error saving note:", error);
    return NextResponse.json({ error: "Failed to save note", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.sub;

    const { id, title, category, content, color, isPinned } = await request.json();

    const existingNote = await Note.findOne({ _id: id, ownerId });
    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const slug = await buildUniqueSlug(title, ownerId, existingNote._id.toString());

    const updateData: Record<string, unknown> = { title, category, content, slug, updatedAt: new Date() };
    if (color !== undefined) updateData.color = color;
    if (isPinned !== undefined) {
      updateData.isPinned = isPinned;
    }

    const hasChanges =
      existingNote.title !== title ||
      existingNote.category !== category ||
      existingNote.content !== content ||
      existingNote.slug !== slug ||
      (color !== undefined && existingNote.color !== color) ||
      (isPinned !== undefined && existingNote.isPinned !== isPinned);

    if (hasChanges) {
      await NoteVersion.create({
        ownerId,
        noteId: existingNote._id.toString(),
        noteSlug: existingNote.slug,
        title: existingNote.title,
        category: existingNote.category,
        content: existingNote.content,
        slug: existingNote.slug,
        color: existingNote.color,
        isPinned: existingNote.isPinned,
      });

      const versionCount = await NoteVersion.countDocuments({ ownerId, noteId: existingNote._id.toString() });
      if (versionCount > 10) {
        const oldVersions = await NoteVersion.find({ ownerId, noteId: existingNote._id.toString() })
          .sort({ createdAt: -1 })
          .skip(10)
          .select('_id');

        if (oldVersions.length > 0) {
          await NoteVersion.deleteMany({ _id: { $in: oldVersions.map(version => version._id) } });
        }
      }
    }

    const updatedNote = await Note.findByIdAndUpdate(
      existingNote._id,
      updateData,
      { returnDocument: 'after' }
    );

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json({ error: "Failed to update note", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// DELETE - Delete note by ID
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.sub;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
    }

    const deletedNote = await Note.findOneAndDelete({ _id: id, ownerId });

    if (!deletedNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Failed to delete note", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}