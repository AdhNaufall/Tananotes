import { connectDB } from "../../../lib/mongodb";
import NoteDraft from "../../../models/NoteDraft";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

function hasMeaningfulContent(payload: { title?: string; category?: string; content?: string; color?: string }) {
  return Boolean(
    (payload.title && payload.title.trim()) ||
    (payload.category && payload.category.trim()) ||
    (payload.content && payload.content.trim()) ||
    (payload.color && payload.color !== '#ffffff')
  );
}

function buildScopedKey(ownerKey: string, scope: string) {
  return `${ownerKey}::${scope}`;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    if (!scope) {
      return NextResponse.json({ error: 'scope is required' }, { status: 400 });
    }

    const scopedScope = buildScopedKey(session.sub, scope);
    const draft = await NoteDraft.findOne({ scope: scopedScope });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { scope, noteId = null, title = '', category = '', content = '', color = '#ffffff', updatedAt } = await request.json();

    if (!scope) {
      return NextResponse.json({ error: 'scope is required' }, { status: 400 });
    }

    const scopedScope = buildScopedKey(session.sub, scope);

    if (!hasMeaningfulContent({ title, category, content, color })) {
      await NoteDraft.findOneAndDelete({ scope: scopedScope });
      return NextResponse.json({ draft: null });
    }

    const existingDraft = await NoteDraft.findOne({ scope: scopedScope });
    const nextUpdatedAt = updatedAt ? new Date(updatedAt) : new Date();

    if (existingDraft && existingDraft.updatedAt && existingDraft.updatedAt > nextUpdatedAt) {
      return NextResponse.json({ draft: existingDraft, skipped: true });
    }

    const draft = await NoteDraft.findOneAndUpdate(
      { scope: scopedScope },
      {
        $set: {
          scope: scopedScope,
          noteId,
          title,
          category,
          content,
          color,
          updatedAt: nextUpdatedAt,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    if (!scope) {
      return NextResponse.json({ error: 'scope is required' }, { status: 400 });
    }

    const scopedScope = buildScopedKey(session.sub, scope);

    await NoteDraft.findOneAndDelete({ scope: scopedScope });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}