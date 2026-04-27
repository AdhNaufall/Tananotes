import Link from 'next/link';
import SearchableNotes from '@/components/SearchableNotes';
import { ArrowLeft, Plus, StickyNote } from 'lucide-react';
import { cookies } from 'next/headers';

// Function to get notes data from MongoDB
async function getNotes(cookieHeader: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notes`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!response.ok) throw new Error('Failed to fetch notes');
    return await response.json();
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

export default async function NotesListPage() {
  const cookieHeader = (await cookies()).toString();
  const allNotes = await getNotes(cookieHeader);
  const total    = allNotes.length;
  const pinned   = allNotes.filter((n: { isPinned?: boolean }) => n.isPinned).length;

  return (
    <main className="px-6 py-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/"
          className="inline-flex items-center justify-center w-11 h-11 bg-white border-2 border-black rounded-full hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] lg:hidden">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </Link>
        <div className="flex-1 lg:flex-none">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-center lg:text-left">All Notes</h1>
          {total > 0 && (
            <p className="text-[12px] font-semibold text-gray-500 text-center lg:text-left mt-0.5">
              {total} catatan · {pinned} dipinned
            </p>
          )}
        </div>
        <Link href="/notes/new"
          className="inline-flex items-center justify-center w-11 h-11 bg-[#93C5FD] border-2 border-black rounded-full hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] lg:hidden">
          <Plus className="w-5 h-5" strokeWidth={3} />
        </Link>
      </div>

      {/* Content */}
      <div>
        {allNotes.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <StickyNote className="w-12 h-12 mx-auto mb-4 text-gray-300" strokeWidth={1.5} />
            <h2 className="text-xl font-extrabold mb-2">Belum Ada Catatan</h2>
            <p className="font-semibold mb-6 text-gray-500 text-sm">
              Mulai tulis catatan pertamamu sekarang!
            </p>
            <Link href="/notes/new"
              className="inline-block px-6 py-3 bg-[#93C5FD] border-2 border-black rounded-full font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
              Buat Catatan
            </Link>
          </div>
        ) : (
          <SearchableNotes allNotes={allNotes} />
        )}
      </div>
    </main>
  );
}
