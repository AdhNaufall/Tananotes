'use client';

import Link from 'next/link';
import { Home, Calendar, Pencil, NotebookText, FolderOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function DesktopNav() {
    const pathname = usePathname();
    const router = useRouter();

    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/login');
        router.refresh();
    };

    return (
        <nav className="hidden lg:flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white sticky top-0 z-40">
            <div className="flex items-center gap-6">
                <Link href="/" className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:-translate-y-0.5 ${pathname === '/' ? 'bg-[#93C5FD] border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}>
                    <Home className="w-5 h-5" strokeWidth={2.5} />
                    <span>Home</span>
                </Link>
                
                <Link href="/notes" className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:-translate-y-0.5 ${pathname === '/notes' ? 'bg-[#93C5FD] border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}>
                    <NotebookText className="w-5 h-5" strokeWidth={2.5} />
                    <span>All Notes</span>
                </Link>
                
                <Link href="/schedule" className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:-translate-y-0.5 ${pathname === '/schedule' ? 'bg-[#93C5FD] border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}>
                    <Calendar className="w-5 h-5" strokeWidth={2.5} />
                    <span>Schedule</span>
                </Link>

                <Link href="/categories/manage" className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:-translate-y-0.5 ${pathname === '/categories/manage' ? 'bg-[#93C5FD] border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}>
                    <FolderOpen className="w-5 h-5" strokeWidth={2.5} />
                    <span>Categories</span>
                </Link>
            </div>
            
            <div className="flex items-center gap-3">
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white border-2 border-black rounded-full font-extrabold transition-all hover:-translate-y-1"
                >
                    Logout
                </button>

                <Link 
                    href="/notes/new" 
                    className="flex items-center gap-2 px-6 py-2 bg-[#93C5FD] border-2 border-black rounded-full font-extrabold transition-all hover:-translate-y-1 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)]"
                >
                    <Pencil className="w-5 h-5" strokeWidth={2.5} />
                    <span>New Note</span>
                </Link>
            </div>
        </nav>
    );
}
