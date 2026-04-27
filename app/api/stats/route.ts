import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Note from '@/models/Note';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    console.log('[Stats API] Starting stats calculation...');
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[Stats API] Database connected');

    const allNotes = await Note.find({ ownerId: session.sub, isDeleted: { $ne: true } });
    console.log('[Stats API] Found notes:', allNotes.length);

    // Total notes
    const totalNotes = allNotes.length;

    // Category statistics
    const categoryStats: { [key: string]: { count: number; color: string; wordCount: number } } = {};
    let totalWords = 0;

    allNotes.forEach((note) => {
      // Count by category
      if (!categoryStats[note.category]) {
        categoryStats[note.category] = {
          count: 0,
          color: note.color || '#ffffff',
          wordCount: 0,
        };
      }
      categoryStats[note.category].count++;

      // Count words in content (strip HTML and count)
      const textContent = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length;
      categoryStats[note.category].wordCount += wordCount;
      totalWords += wordCount;
    });

    // Sort categories by count
    const topCategories = Object.entries(categoryStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        color: data.color,
        wordCount: data.wordCount,
      }))
      .sort((a, b) => b.count - a.count);

    // Activity by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityMap: { [key: string]: number } = {};
    allNotes.forEach((note) => {
      const noteDate = new Date(note.createdAt);
      if (noteDate >= thirtyDaysAgo) {
        const dateKey = noteDate.toISOString().split('T')[0];
        activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
      }
    });

    // Recent notes count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentNotesCount = allNotes.filter(
      (note) => new Date(note.createdAt) >= sevenDaysAgo
    ).length;

    // Pinned notes count
    const pinnedCount = allNotes.filter((note) => note.isPinned).length;

    // Average words per note
    const avgWordsPerNote = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

    return NextResponse.json({
      totalNotes,
      totalCategories: Object.keys(categoryStats).length,
      totalWords,
      avgWordsPerNote,
      pinnedCount,
      recentNotesCount,
      topCategories,
      activityMap,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = error instanceof Error ? error.stack : undefined;
    console.error('[Stats API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
      },
      { status: 500 }
    );
  }
}
