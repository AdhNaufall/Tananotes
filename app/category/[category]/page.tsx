import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import SearchableNotes from '@/components/SearchableNotes';
import { cookies } from 'next/headers';

type CategoryNote = {
  category: string;
};

async function getNotesByCategory(category: string, cookieHeader: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notes`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!response.ok) return [];
    const notes = await response.json();
    return notes.filter((note: CategoryNote) => note.category.toLowerCase() === category.toLowerCase());
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cookieHeader = (await cookies()).toString();
  // Decode URL-encoded category name (e.g., "test%201" -> "test 201")
  const decodedCategory = decodeURIComponent(category);
  const categoryNotes = await getNotesByCategory(decodedCategory, cookieHeader);
  const actualCategory = categoryNotes.length > 0 ? categoryNotes[0].category : decodedCategory;

  return (
    <main className="px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/"
          className="inline-flex items-center justify-center w-12 h-12 bg-white border-2 border-black rounded-full hover:-translate-y-0.5 transition-transform brutalist-shadow">
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight truncate max-w-[200px]">{actualCategory} Notes</h1>
        <Link href="/notes/new"
          className="inline-flex items-center justify-center w-12 h-12 bg-[#93C5FD] border-2 border-black rounded-full hover:-translate-y-0.5 transition-transform brutalist-shadow">
          <Plus className="w-6 h-6" strokeWidth={3} />
        </Link>
      </div>

      {/* Content */}
      <div className="mb-32">
        {categoryNotes.length === 0 ? (
          <div className="text-center py-16 bg-white border-2 border-black rounded-[2rem] p-8 brutalist-shadow">
            <h2 className="text-xl font-extrabold mb-3">No Notes in {actualCategory}</h2>
            <p className="font-semibold mb-6 text-gray-600">
              You haven&apos;t created any notes in this category yet.
            </p>
            <Link href="/notes/new"
              className="inline-block px-6 py-3 bg-[#93C5FD] border-2 border-black rounded-full font-bold brutalist-shadow hover:-translate-y-0.5 transition-transform">
              Create Note
            </Link>
          </div>
        ) : (
          <SearchableNotes allNotes={categoryNotes} />
        )}
      </div>
    </main>
  );
}
