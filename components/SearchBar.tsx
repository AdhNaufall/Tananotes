"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { buildSmartSummary } from '@/lib/noteSummary';

interface SearchBarProps {
  onClose?: () => void;
  autoFocus?: boolean;
}

type SearchResultNote = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  searchHighlights?: {
    title?: string;
    category?: string;
    snippet?: string;
  };
};

export default function SearchBar({ onClose, autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const searchNotes = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/notes?search=${encodeURIComponent(query)}`);
        if (response.ok) {
          const notes = await response.json();
          setResults(notes);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchNotes, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-gray-500" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full pl-12 pr-12 py-3 border-2 border-black rounded-full bg-white font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {query && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border-2 border-black rounded-3xl overflow-hidden brutalist-shadow z-50 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500 font-semibold">Searching...</div>
          ) : results.length > 0 ? (
            <div className="divide-y-2 divide-gray-200">
              {results.map((note) => {
                const summary = buildSmartSummary(note.content || '', { maxLength: 120 });

                return (
                  <Link
                    key={note._id}
                    href={`/notes/${note.slug}`}
                    onClick={onClose}
                    className="block p-5 hover:bg-[#93C5FD] transition-colors"
                  >
                    <h3
                      className="font-bold text-lg mb-1"
                      dangerouslySetInnerHTML={{ __html: note.searchHighlights?.title || note.title }}
                    />
                    <p
                      className="text-sm text-gray-600 font-semibold"
                      dangerouslySetInnerHTML={{ __html: note.searchHighlights?.category || note.category }}
                    />
                    {(note.searchHighlights?.snippet || summary.preview) && (
                      <p
                        className="text-sm text-gray-500 mt-2 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: note.searchHighlights?.snippet || summary.preview,
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 font-semibold">No notes found</div>
          )}
        </div>
      )}
    </div>
  );
}
