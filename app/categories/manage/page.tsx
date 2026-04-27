import Link from "next/link";
import { Folder, ArrowLeft, FileText } from "lucide-react";
import { cookies } from 'next/headers';

type CategorySourceNote = {
  category: string;
  color?: string;
};

// Function to get all categories with note counts and colors
async function getCategoriesWithCounts(cookieHeader: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notes`, {
      cache: 'no-store',
      headers: { cookie: cookieHeader },
    });
    if (!response.ok) return [];
    const notes = await response.json();

    // Count notes per category and get their colors
    const categoryData: { [key: string]: { count: number; color: string } } = {};
    notes.forEach((note: CategorySourceNote) => {
      if (!categoryData[note.category]) {
        categoryData[note.category] = { 
          count: 0, 
          color: note.color || '#93C5FD' 
        };
      }
      categoryData[note.category].count++;
      // Update color if found (prefer non-white colors)
      if (note.color && note.color !== '#ffffff') {
        categoryData[note.category].color = note.color;
      }
    });

    return Object.entries(categoryData).map(([name, data]) => ({
      name,
      count: data.count,
      color: data.color
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export default async function CategoriesManagePage() {
  const cookieHeader = (await cookies()).toString();
  const categories = await getCategoriesWithCounts(cookieHeader);

  return (
    <main className="min-h-screen px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-black rounded-full font-extrabold hover:-translate-y-0.5 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] text-black lg:hidden">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-black flex items-center gap-3 lg:flex-1">
            <Folder className="w-8 h-8" strokeWidth={2.5} />
            Categories
          </h1>
        </div>
        <p className="text-sm md:text-base font-bold text-gray-600">Organize and manage your note collections</p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link key={category.name} href={`/category/${category.name.toLowerCase()}`}>
              <div 
                className="bg-white border-2 border-black rounded-2xl p-6 hover:-translate-y-1 transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-14 h-14 border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    style={{ backgroundColor: category.color }}
                  >
                    <Folder className="w-7 h-7 text-black" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-extrabold bg-black text-white px-3 py-1.5 rounded-full border-2 border-black">
                    {category.count} {category.count === 1 ? 'note' : 'notes'}
                  </span>
                </div>

                <h3 className="font-extrabold text-xl text-black group-hover:text-gray-700 transition-colors mb-2 line-clamp-2">
                  {category.name}
                </h3>
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Click to view all notes
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto bg-white border-2 border-dashed border-black rounded-3xl p-12 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div className="w-20 h-20 bg-[#FDE047] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <Folder className="w-10 h-10 text-black" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-black mb-3">No Categories Yet</h3>
            <p className="text-base font-bold text-gray-600 mb-6">Categories will appear automatically when you create notes</p>
            <Link href="/notes/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#93C5FD] border-2 border-black text-black rounded-full hover:-translate-y-1 transition-all font-extrabold shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)]">
              <FileText className="w-5 h-5" strokeWidth={2.5} />
              Create Your First Note
            </Link>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 md:mt-12 bg-white border-2 border-black rounded-3xl p-6 md:p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl md:text-2xl font-extrabold text-black mb-4 md:mb-6 flex items-center gap-2">
          <span>💡</span> About Categories
        </h2>
        <div className="space-y-3 text-sm md:text-base font-semibold text-gray-700">
          <p className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-[#93C5FD] border border-black mt-1.5 flex-shrink-0"></span>
            <span>Categories are created automatically when you create notes</span>
          </p>
          <p className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-[#FCA5A5] border border-black mt-1.5 flex-shrink-0"></span>
            <span>Assign categories when creating or editing notes</span>
          </p>
          <p className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-[#FDE047] border border-black mt-1.5 flex-shrink-0"></span>
            <span>Each category gets a unique color for easy identification</span>
          </p>
          <p className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-[#93EB7D] border border-black mt-1.5 flex-shrink-0"></span>
            <span>Click any category to view all notes within it</span>
          </p>
        </div>
      </div>
    </main>
  );
}