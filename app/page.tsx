import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import TodoList from "@/components/TodoList";
import ScheduleList from "@/components/ScheduleList";
import StatsDashboard from "@/components/StatsDashboard";
import { buildSmartSummary } from "@/lib/noteSummary";
import { cookies } from "next/headers";

type DashboardNote = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  color?: string;
};

function normalizeDashboardImageSrc(src: string | null): string | null {
  if (!src) return null;
  if (src.startsWith('/')) return src;

  try {
    const parsed = new URL(src);
    const localBase = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const localOrigin = new URL(localBase).origin;

    if (parsed.origin === localOrigin || parsed.origin === 'http://localhost:3000' || parsed.origin === 'http://127.0.0.1:3000') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return src;
  } catch {
    return src;
  }
}

// Single fetch to get all needed data at once (avoids double MongoDB round-trip)
async function getDashboardData(cookieHeader: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notes`,
      { cache: 'no-store', headers: { cookie: cookieHeader } }
    );
    if (!response.ok) return { recentNotes: [], categories: [] };
    const notes = await response.json();
    const recentNotes = notes.slice(0, 6);
    
    // Extract unique categories and prioritize non-white colors
    const categoryMap = new Map<string, string>();
    const PALETTE = ['#93C5FD', '#FCA5A5', '#FEF08A', '#A7F3D0', '#FF6B6B', '#93EB7D', '#B28DFF'];
    let paletteIndex = 0;

    // First pass: capture explicitly set colors
    notes.forEach((note: DashboardNote) => {
      const cat = note.category;
      if (cat && cat.trim() !== '') {
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, (note.color && note.color !== '#ffffff') ? note.color : '');
        } else if (note.color && note.color !== '#ffffff') {
          if (!categoryMap.get(cat)) {
            categoryMap.set(cat, note.color);
          }
        }
      }
    });

    // Second pass: fill in missing colors for categories that were created before colors existed
    const sortedCategories = Array.from(categoryMap.keys()).sort();
    sortedCategories.forEach(cat => {
      if (!categoryMap.get(cat)) {
        categoryMap.set(cat, PALETTE[paletteIndex % PALETTE.length]);
        paletteIndex++;
      }
    });
    
    // Inject the resolved map color back into the returned categories AND actual notes
    const categories = Array.from(categoryMap.entries()).map(([name, color]) => ({ name, color }));
    const recentNotesMapped = recentNotes.map((n: DashboardNote) => ({
      ...n,
      color: categoryMap.get(n.category) || n.color || '#ffffff'
    }));

    return { recentNotes: recentNotesMapped, categories };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { recentNotes: [], categories: [] };
  }
}

export default async function Home() {
  const cookieHeader = (await cookies()).toString();
  const { recentNotes, categories } = await getDashboardData(cookieHeader);

  // mock categories if empty
  const displayCats = categories.length > 0 ? categories : [
    { name: "home", color: "#93C5FD" },
    { name: "work", color: "#FCA5A5" },
    { name: "school", color: "#FEF08A" },
    { name: "other", color: "#A7F3D0" }
  ];

  return (
    <main className="px-5 py-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="mb-6 mt-1">
        <div className="flex items-center gap-2 mb-1">
          <Logo className="w-10 h-10" />
          <h1 className="text-[28px] font-extrabold tracking-tight text-black">Tananotes</h1>
        </div>
        <p className="text-[12px] text-gray-600 font-semibold tracking-wide">Your personal digital notebook</p>
      </header>

      {/* Search Bar */}
      <section className="mb-6">
        <SearchBar />
      </section>

      {/* My Folder */}
      <section className="mb-6">
        <h2 className="text-[16px] font-bold mb-3 tracking-wide">My Folder</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 pt-1 px-1 -mx-1 snap-x">
          {displayCats.map((cat, i) => {
            return (
              <Link key={i} href={`/category/${cat.name.toLowerCase()}`}
                style={{ backgroundColor: cat.color || '#ffffff' }}
                className="flex-shrink-0 snap-start px-6 py-2.5 rounded-full border-2 border-black font-extrabold whitespace-nowrap text-[14px] transition-all hover:-translate-y-[2px] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] text-black">
                {cat.name}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Statistics Dashboard */}
      <section className="mb-6">
        <StatsDashboard />
      </section>

      {/* To-do list */}
      <section className="mb-6">
        <TodoList />
      </section>

      {/* Recent Note & Schedule Columns */}
      <div className={`grid gap-4 md:gap-6 ${recentNotes.length > 0 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Left Column: Recent Note */}
        {recentNotes.length > 0 && (
          <section>
            <h2 className="text-[16px] font-bold mb-3 tracking-wide text-black">Recent Note</h2>
            <div className="flex flex-col gap-4">
              {recentNotes.slice(0, 4).map((note: DashboardNote) => {
                // Extract first image from content
                const imgMatch = note.content?.match(/<img[^>]+src="([^">]+)"/);
                const imageUrl = normalizeDashboardImageSrc(imgMatch ? imgMatch[1] : null);
                const summary = buildSmartSummary(note.content || '', { maxLength: 165 });
                const bgColor = note.color || '#ffffff';

                return (
                  <Link key={note._id} href={`/notes/${note.slug}`}
                    className="border-2 border-black rounded-[2rem] p-4 flex flex-col justify-between overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] transition-all bg-white"
                    style={{ minHeight: '170px' }}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-[15px] leading-tight line-clamp-1">{note.title}</h3>
                        {summary.headings[0] && (
                          <p className="text-[10px] uppercase tracking-wide font-extrabold text-gray-500 mt-1 line-clamp-1">
                            Fokus: {summary.headings[0]}
                          </p>
                        )}
                        <p className="text-[12px] font-semibold text-gray-500 mt-1 line-clamp-3 leading-relaxed">
                          {summary.preview}
                        </p>
                      </div>
                      {imageUrl && (
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 border-black">
                          <Image 
                            src={imageUrl} 
                            alt={`${note.title} image`} 
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <span className="text-[11px] font-bold text-black border border-black px-3 py-1.5 rounded mt-1 inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%]" style={{ backgroundColor: bgColor }}>
                        {note.category}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Right Column: Schedule */}
        <section>
          <h2 className="text-[16px] font-bold mb-3 tracking-wide text-black text-center sm:text-left">Schedule</h2>
          <ScheduleList />
        </section>
      </div>
    </main>
  );
}
