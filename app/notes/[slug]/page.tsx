import Link from 'next/link';
import { ArrowLeft, Edit, Pin } from 'lucide-react';
import ExportButton from '@/components/ExportButton';
import { cookies } from 'next/headers';


async function getNoteBySlug(slug: string, cookieHeader: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notes/${slug}`,
      { cache: 'no-store', headers: { cookie: cookieHeader } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching note by slug:', error);
    return null;
  }
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieHeader = (await cookies()).toString();

 
  const postData = await getNoteBySlug(slug, cookieHeader);

    if (!postData) {
      return (
        <main className="p-8 pb-32">
          <div className="bg-white border-2 border-black rounded-[2rem] p-10 text-center brutalist-shadow">
            <h1 className="text-3xl font-extrabold mb-4">Note Not Found</h1>
            <p className="font-bold mb-8">The note with slug &quot;{slug}&quot; could not be found.</p>
            <Link href="/notes" className="inline-flex items-center gap-2 px-6 py-3 bg-[#93C5FD] border-2 border-black rounded-full font-bold brutalist-shadow hover:-translate-y-1 transition-transform">
              <ArrowLeft className="w-5 h-5" /> Back to Notes
            </Link>
          </div>
        </main>
      );
  }

  return (
    <main className="px-6 py-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-3">
        <Link href="/notes" className="inline-flex items-center justify-center w-11 h-11 bg-white border-2 border-black rounded-full shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform shrink-0">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <ExportButton note={{
            title:     postData.title,
            category:  postData.category,
            content:   postData.content,
            createdAt: postData.createdAt,
            updatedAt: postData.updatedAt,
          }} />
          <Link href={`/notes/${slug}/edit`} className="inline-flex items-center justify-center w-11 h-11 bg-[#FDE047] border-2 border-black rounded-full shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
            <Edit className="w-5 h-5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border-2 border-black rounded-[2rem] p-6 brutalist-shadow relative mb-8">
        {postData.isPinned && (
          <div className="absolute top-6 right-6 w-10 h-10 bg-[#FDE047] border-2 border-black rounded-full flex items-center justify-center rotate-12 z-10">
            <Pin className="w-5 h-5 fill-black" />
          </div>
        )}

        <h1 className="text-[28px] font-extrabold leading-tight mb-4 pr-10">{postData.title}</h1>

        <div className="flex flex-wrap items-center gap-3 mb-6 border-b-2 border-black pb-6">
          <span className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-bold">
            {postData.category}
          </span>
          {postData.createdAt && (
            <span className="text-sm font-bold opacity-80">
              {new Date(postData.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              })}
            </span>
          )}
        </div>

        <div className="prose prose-lg max-w-none text-black font-semibold leading-relaxed
                        [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:border-2 [&_img]:border-black
                        [&_.image-wrapper]:border-none [&_.image-wrapper]:resize-none [&_.image-wrapper_button]:hidden"
          dangerouslySetInnerHTML={{ __html: postData.content }} />
      </div>
    </main>
  );
}