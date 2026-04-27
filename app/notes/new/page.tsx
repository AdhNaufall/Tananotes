"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfessionalEditor from '@/components/ProfessionalEditor';

export default function NewNotePage() {
  const router = useRouter();
  const autosaveVersion = useRef(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [isLoading, setIsLoading] = useState(false);
  const [existingCategories, setExistingCategories] = useState<{name: string, color: string}[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'dirty' | 'error'>('loading');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const draftScope = 'new-note';
  const legacyDraftKey = 'tananotes-note-draft:new';

  const availableColors = ['#ffffff', '#93C5FD', '#7FAED0', '#FDE047', '#93EB7D', '#FF6B6B'];

  const matchingCategory = existingCategories.find(c => c.name.toLowerCase() === category.trim().toLowerCase());
  const isColorLocked = !!matchingCategory && matchingCategory.color !== '#ffffff';

  useEffect(() => {
    if (matchingCategory && matchingCategory.color !== '#ffffff') {
      setColor(matchingCategory.color);
    }
  }, [matchingCategory]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const categories = await response.json();
          setExistingCategories(categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const [serverResponse, legacyRaw] = await Promise.all([
          fetch(`/api/drafts?scope=${encodeURIComponent(draftScope)}`),
          Promise.resolve(typeof window !== 'undefined' ? localStorage.getItem(legacyDraftKey) : null),
        ]);

        const serverPayload = serverResponse.ok ? await serverResponse.json() : { draft: null };
        const serverDraft = serverPayload?.draft || null;
        const legacyDraft = legacyRaw ? JSON.parse(legacyRaw) : null;

        const serverUpdatedAt = serverDraft?.updatedAt ? new Date(serverDraft.updatedAt).getTime() : 0;
        const legacyUpdatedAt = legacyDraft?.updatedAt ? new Date(legacyDraft.updatedAt).getTime() : 0;

        const chosenDraft = legacyDraft && legacyUpdatedAt > serverUpdatedAt ? legacyDraft : serverDraft;

        if (chosenDraft) {
          setTitle(chosenDraft.title || '');
          setCategory(chosenDraft.category || '');
          setContent(chosenDraft.content || '');
          setColor(chosenDraft.color || '#ffffff');
          setDraftStatus('saved');
          setLastSavedAt(chosenDraft.updatedAt || null);
        } else {
          setDraftStatus('saved');
        }

        if (legacyDraft) {
          try {
            await fetch('/api/drafts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scope: draftScope,
                title: legacyDraft.title || '',
                category: legacyDraft.category || '',
                content: legacyDraft.content || '',
                color: legacyDraft.color || '#ffffff',
                updatedAt: legacyDraft.updatedAt || new Date().toISOString(),
              }),
            });
          } catch (error) {
            console.error('Error migrating legacy draft:', error);
          }

          try {
            localStorage.removeItem(legacyDraftKey);
          } catch {}
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        setDraftStatus('error');
      } finally {
        setDraftReady(true);
      }
    };

    loadDraft();
  }, []);

  const syncDraft = useCallback(async (keepalive = false) => {
    const payload = {
      scope: draftScope,
      title: title.trim(),
      category: category.trim(),
      content,
      color,
      updatedAt: new Date().toISOString(),
    };

    const hasContent = Boolean(payload.title || payload.category || payload.content.trim() || payload.color !== '#ffffff');

    if (!hasContent) {
      await fetch(`/api/drafts?scope=${encodeURIComponent(draftScope)}`, {
        method: 'DELETE',
        ...(keepalive ? { keepalive: true } : {}),
      });
      return;
    }

    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      ...(keepalive ? { keepalive: true } : {}),
    });

    if (!response.ok) {
      throw new Error('Failed to save draft');
    }
  }, [title, category, content, color, draftScope]);

  useEffect(() => {
    if (!draftReady) return;

    setDraftStatus('dirty');
    const currentVersion = autosaveVersion.current;

    const timer = window.setTimeout(async () => {
      if (currentVersion !== autosaveVersion.current) return;

      try {
        setDraftStatus('saving');
        await syncDraft();
        setDraftStatus('saved');
        setLastSavedAt(new Date().toISOString());
      } catch (error) {
        console.error('Error saving draft:', error);
        setDraftStatus('error');
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [title, category, content, color, draftReady, syncDraft]);

  useEffect(() => {
    const persistBeforeExit = () => {
      if (!draftReady) return;
      syncDraft(true).catch(error => console.error('Error flushing draft on exit:', error));
    };

    window.addEventListener('pagehide', persistBeforeExit);
    window.addEventListener('beforeunload', persistBeforeExit);

    return () => {
      window.removeEventListener('pagehide', persistBeforeExit);
      window.removeEventListener('beforeunload', persistBeforeExit);
    };
  }, [draftReady, title, category, content, color, syncDraft]);

  const clearDraft = async () => {
    try {
      autosaveVersion.current += 1;
      await fetch(`/api/drafts?scope=${encodeURIComponent(draftScope)}`, { method: 'DELETE' });
      setDraftStatus('saved');
      setLastSavedAt(null);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content!');
      return;
    }

    if (!category.trim()) {
      alert('Please enter or select a category!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim(),
          content: content.trim(),
          color: color,
          isPinned: false
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        await clearDraft();
        router.push(`/notes/${newNote.slug}`);
      } else {
        const errorData = await response.json();
        alert('Failed to save note: ' + (errorData.details || errorData.error));
      }
    } catch (error) {
      alert('Error saving note. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8">
      {/* Home button */}
      <div className="mb-6 sm:mb-8">
        <Link href="/"
          className="inline-block px-5 py-2 bg-[#93C5FD] border-2 border-black rounded-full text-[15px] font-extrabold tracking-wide hover:-translate-y-0.5 transition-transform brutalist-shadow">
          home
        </Link>
      </div>

      <div className="space-y-4 mb-6 relative z-30">
        {draftReady && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-black rounded-full text-sm font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
            draftStatus === 'saving' ? 'bg-[#FDE047]' : draftStatus === 'error' ? 'bg-[#FF6B6B]' : draftStatus === 'dirty' ? 'bg-[#FCA5A5]' : 'bg-white'
          }`}>
            {draftStatus === 'saving' && 'Saving draft...'}
            {draftStatus === 'saved' && 'Draft saved'}
            {draftStatus === 'dirty' && 'Unsaved changes'}
            {draftStatus === 'error' && 'Autosave failed'}
            {draftStatus === 'loading' && 'Loading draft...'}
            {lastSavedAt && draftStatus !== 'saving' && (
              <span className="text-xs text-gray-600 font-semibold">
                · last saved {new Date(lastSavedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {/* Title and Save */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="write the tittle here..."
            className="flex-1 px-5 py-3 border-2 border-black rounded-full bg-white font-bold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
          />
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 bg-[#93C5FD] border-2 border-black rounded-full font-extrabold hover:-translate-y-1 transition-transform brutalist-shadow whitespace-nowrap"
          >
            {isLoading ? '...' : 'save'}
          </button>
        </div>

        {/* Category Dropdown and Color Picker */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative inline-block w-full max-w-[190px] z-20">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
              placeholder="create/select category"
              className="w-full px-5 py-3 border-2 border-black rounded-full bg-white font-bold placeholder-black text-sm focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
            />
            {showCategoryDropdown && existingCategories.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white border-2 border-black rounded-2xl z-50 overflow-hidden brutalist-shadow">
                {existingCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCategory(cat.name);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-[#93C5FD] font-bold border-b-2 border-black last:border-b-0 flex items-center gap-2"
                  >
                    <span className="w-3 h-3 rounded-full border border-black inline-block" style={{ backgroundColor: cat.color || '#fff' }}></span>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`flex gap-2 bg-white border-2 border-black p-2 rounded-full z-10 hidden sm:flex ${isColorLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {availableColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                disabled={isColorLocked}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full border-2 border-black transition-transform ${color === c ? 'scale-110 shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'hover:-translate-y-0.5'}`}
              />
            ))}
          </div>
        </div>
        
        {/* Mobile color picker */}
        <div className={`flex gap-2 bg-white border-2 border-black p-2 rounded-full sm:hidden w-max mx-auto mt-2 ${isColorLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {availableColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                disabled={isColorLocked}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full border-2 border-black transition-transform ${color === c ? 'scale-110 shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'hover:-translate-y-0.5'}`}
              />
            ))}
        </div>
      </div>

      {/* Text Editor */}
      <div className="relative z-0">
        <ProfessionalEditor
          value={content}
          onChange={setContent}
          placeholder="write your note here..."
        />
      </div>
    </main>
  );
}
