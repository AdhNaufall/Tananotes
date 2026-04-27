"use client";

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-full bg-white dark:bg-[#2a2a2a] border-2 border-black dark:border-white transition-all hover:-translate-y-0.5 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(245,245,245,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] dark:hover:shadow-[5px_5px_0px_rgba(245,245,245,1)]"
      aria-label="Toggle dark mode"
      title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-[#FDE047]" strokeWidth={2.5} />
      ) : (
        <Moon className="w-5 h-5 text-[#4B789C]" strokeWidth={2.5} />
      )}
    </button>
  );
}
