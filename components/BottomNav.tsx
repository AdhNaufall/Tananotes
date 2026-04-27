'use client';

import Link from 'next/link';
import { Calendar, Pencil, NotebookText, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const isEditNotePage = /^\/notes\/[^/]+\/edit$/.test(pathname);

    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    // Hide bottom nav on specific pages like 'notes/new'
    if (pathname === '/notes/new' || isEditNotePage) {
        return null; /* Add notes page uses a different floating toolbar */
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/login');
        router.refresh();
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center lg:hidden">
            <div className="bg-[var(--color-nav-bg)] rounded-full px-8 py-3 flex items-center gap-8 brutalist-border brutalist-shadow">

                <Link href="/notes" className="text-white hover:opacity-80 transition-opacity">
                    <NotebookText className="w-6 h-6" strokeWidth={2.5} />
                </Link>

                {/* Floating Create Button */}
                <Link
                    href="/notes/new"
                    className="bg-white rounded-full w-12 h-12 flex items-center justify-center absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 brutalist-border brutalist-shadow hover:scale-110 transition-transform"
                >
                    <Pencil className="w-5 h-5 text-black" strokeWidth={2.5} />
                </Link>

                <Link href="/schedule" className="text-white hover:opacity-80 transition-opacity">
                    <Calendar className="w-6 h-6" strokeWidth={2.5} />
                </Link>

                <button
                    onClick={handleLogout}
                    className="text-white hover:opacity-80 transition-opacity"
                    title="Logout"
                    aria-label="Logout"
                >
                    <LogOut className="w-6 h-6" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
