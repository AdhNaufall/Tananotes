'use client';

import Link from 'next/link';
import { Pencil, NotebookText, LogOut } from 'lucide-react';
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center lg:hidden">
            <div className="bg-[var(--color-nav-bg)] rounded-full px-4 py-3 flex items-center gap-3 brutalist-border brutalist-shadow">

                <Link href="/notes" className="flex items-center gap-2 px-4 py-2 rounded-full text-white hover:bg-white/10 transition-colors">
                    <NotebookText className="w-6 h-6" strokeWidth={2.5} />
                    <span className="text-sm font-extrabold leading-none">Notes</span>
                </Link>

                <Link
                    href="/notes/new"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black brutalist-border brutalist-shadow hover:-translate-y-0.5 transition-transform"
                >
                    <Pencil className="w-[18px] h-[18px] text-black" strokeWidth={2.5} />
                    <span className="text-sm font-extrabold leading-none whitespace-nowrap">New Note</span>
                </Link>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-white hover:bg-white/10 transition-colors"
                    title="Logout"
                    aria-label="Logout"
                >
                    <LogOut className="w-6 h-6" strokeWidth={2.5} />
                    <span className="text-sm font-extrabold leading-none">Logout</span>
                </button>
            </div>
        </div>
    );
}
