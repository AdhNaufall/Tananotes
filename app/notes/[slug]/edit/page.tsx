"use client";

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, History } from 'lucide-react';
import ProfessionalEditor from '@/components/ProfessionalEditor';
import VersionHistoryModal from '@/components/VersionHistoryModal';

interface Note {
  _id: string;
  title: string;
  category: string;
  content: string;
  slug: string;
  color?: string;
  isPinned?: boolean;
}

type DraftPayload = {
  title?: string;
  category?: string;
  content?: string;
  color?: string;
  updatedAt?: string;
};

export default function EditNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const autosaveVersion = useRef(0);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingCategories, setExistingCategories] = useState<{name: string, color: string}[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'dirty' | 'error'>('loading');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [versions, setVersions] = useState<Array<{
    _id: string;
    title: string;
    category: string;
    content: string;
    slug: string;
    color: string;
    isPinned: boolean;
    createdAt: string;
  }>>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const legacyDraftKey = `tananotes-note-draft:${slug}`;

  const availableColors = ['#ffffff', '#93C5FD', '#7FAED0', '#FDE047', '#93EB7D', '#FF6B6B'];

  const matchingCategory = existingCategories.find(c => c.name.toLowerCase() === category.trim().toLowerCase());
  const isColorLocked = !!matchingCategory && matchingCategory.color !== '#ffffff';

  useEffect(() => {
    if (matchingCategory && matchingCategory.color !== '#ffffff') {
      setColor(matchingCategory.color);
    }
  }, [matchingCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await fetch('/api/categories');
        if (catRes.ok) setExistingCategories(await catRes.json());

        const res = await fetch(`/api/notes/${slug}`);
        if (!res.ok) throw new Error('Note not found');
        const foundNote = await res.json();

        setNote(foundNote);
        setTitle(foundNote.title);
        setCategory(foundNote.category);
        setContent(foundNote.content);
        setColor(foundNote.color || '#ffffff');

        try {
          const [draftResponse, legacyRaw] = await Promise.all([
            fetch(`/api/drafts?scope=${encodeURIComponent(`note:${foundNote._id}`)}`),
            Promise.resolve(typeof window !== 'undefined' ? localStorage.getItem(legacyDraftKey) : null),
          ]);

          const draftPayload = draftResponse.ok ? await draftResponse.json() : { draft: null };
          const serverDraft: DraftPayload | null = draftPayload?.draft || null;
          const legacyDraft: DraftPayload | null = legacyRaw ? JSON.parse(legacyRaw) : null;

          const noteUpdatedAt = foundNote.updatedAt ? new Date(foundNote.updatedAt).getTime() : 0;
          const serverUpdatedAt = serverDraft?.updatedAt ? new Date(serverDraft.updatedAt).getTime() : 0;
          const legacyUpdatedAt = legacyDraft?.updatedAt ? new Date(legacyDraft.updatedAt).getTime() : 0;

          const draftCandidates: DraftPayload[] = [serverDraft, legacyDraft].filter(
            (draft): draft is DraftPayload => Boolean(draft)
          );
          const chosenDraft = draftCandidates.length > 0
            ? draftCandidates.reduce((latest, current) => {
                const latestTime = latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0;
                const currentTime = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
                return currentTime > latestTime ? current : latest;
              })
            : null;

          const chosenUpdatedAt = chosenDraft?.updatedAt ? new Date(chosenDraft.updatedAt).getTime() : 0;
          if (chosenDraft && chosenUpdatedAt >= Math.max(noteUpdatedAt, serverUpdatedAt, legacyUpdatedAt)) {
            setTitle(chosenDraft.title ?? foundNote.title);
            setCategory(chosenDraft.category ?? foundNote.category);
            setContent(chosenDraft.content ?? foundNote.content);
            setColor(chosenDraft.color ?? foundNote.color ?? '#ffffff');
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
                  scope: `note:${foundNote._id}`,
                  noteId: foundNote._id,
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
          console.error('Error restoring draft:', error);
          setDraftStatus('error');
        }

        try {
          setVersionsLoading(true);
          const versionResponse = await fetch(`/api/notes/${slug}/versions`);
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            setVersions(Array.isArray(versionData.versions) ? versionData.versions : []);
          }
        } catch (error) {
          console.error('Error loading versions:', error);
        } finally {
          setVersionsLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        router.push('/notes');
      } finally {
        setIsLoading(false);
        setDraftReady(true);
      }
    };
    fetchData();
  }, [slug, router, legacyDraftKey]);

  const syncDraft = useCallback(async (keepalive = false) => {
    if (!note) return;

    const payload = {
      scope: `note:${note._id}`,
      noteId: note._id,
      title: title.trim(),
      category: category.trim(),
      content,
      color,
      updatedAt: new Date().toISOString(),
    };

    const hasContent = Boolean(payload.title || payload.category || payload.content.trim() || payload.color !== '#ffffff');

    if (!hasContent) {
      await fetch(`/api/drafts?scope=${encodeURIComponent(payload.scope)}`, {
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
  }, [note, title, category, content, color]);

  useEffect(() => {
    if (!draftReady || !note) return;
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
  }, [title, category, content, color, draftReady, note, syncDraft]);

  useEffect(() => {
    const persistBeforeExit = () => {
      if (!note) return;

      syncDraft(true).catch(error => console.error('Error flushing draft on exit:', error));
    };

    window.addEventListener('pagehide', persistBeforeExit);
    window.addEventListener('beforeunload', persistBeforeExit);

    return () => {
      window.removeEventListener('pagehide', persistBeforeExit);
      window.removeEventListener('beforeunload', persistBeforeExit);
    };
  }, [title, category, content, color, note, syncDraft]);

  const clearDraft = async () => {
    try {
      autosaveVersion.current += 1;
      if (note) {
        await fetch(`/api/drafts?scope=${encodeURIComponent(`note:${note._id}`)}`, { method: 'DELETE' });
      }
      setDraftStatus('saved');
      setLastSavedAt(null);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!note) return;
    try {
      const response = await fetch(`/api/notes/${note.slug}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      const data = await response.json();
      const restoredNote = data.note;
      setNote(restoredNote);
      setTitle(restoredNote.title);
      setCategory(restoredNote.category);
      setContent(restoredNote.content);
      setColor(restoredNote.color || '#ffffff');
      await clearDraft();
      const refreshed = await fetch(`/api/notes/${restoredNote.slug}/versions`);
      if (refreshed.ok) {
        const refreshedData = await refreshed.json();
        setVersions(Array.isArray(refreshedData.versions) ? refreshedData.versions : []);
      }
      setHistoryOpen(false);
      router.replace(`/notes/${restoredNote.slug}/edit`);
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    }
  };

  const undoLatestVersion = async () => {
    const latest = versions[0];
    if (!latest) return;
    await restoreVersion(latest._id);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !note) return alert('Title and content are required!');
    if (!category.trim()) return alert('Category is required!');

    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note._id,
          title: title.trim(),
          category: category.trim(),
          content: content.trim(),
          color: color,
          isPinned: note.isPinned
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        await clearDraft();
        const refreshedVersions = await fetch(`/api/notes/${updated.slug}/versions`);
        if (refreshedVersions.ok) {
          const versionData = await refreshedVersions.json();
          setVersions(Array.isArray(versionData.versions) ? versionData.versions : []);
        }
        router.push(`/notes/${updated.slug}`);
      } else {
        alert('Failed to save note');
      }
    } catch {
      alert('Error saving note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !confirm('Are you sure you want to delete this note?')) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/notes?id=${note._id}`, { method: 'DELETE' });
      if (response.ok) {
        await clearDraft();
        router.push('/notes');
      } else {
        alert('Failed to delete note');
      }
    } catch {
      alert('Error deleting note');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="px-6 py-8 font-bold">Loading...</div>;
  if (!note) return <div className="px-6 py-8 font-bold">Note not found.</div>;

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8">
      {/* Header buttons */}
      <div className="flex justify-between items-center mb-6 sm:mb-8 gap-3">
        <Link href={`/notes/${note.slug}`}
          className="inline-flex items-center justify-center px-4 sm:px-5 py-2 bg-white border-2 border-black rounded-full font-extrabold hover:-translate-y-0.5 transition-transform brutalist-shadow">
          <ArrowLeft className="w-5 h-5 mr-1" /> Back
        </Link>

        <button onClick={handleDelete} disabled={isDeleting}
          className="inline-flex items-center justify-center p-3 bg-[#FF6B6B] border-2 border-black rounded-full hover:-translate-y-0.5 transition-transform brutalist-shadow">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 mb-6 relative z-20">
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
          <div className="flex w-full sm:w-auto gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-3 bg-[#93C5FD] border-2 border-black rounded-full font-extrabold hover:-translate-y-0.5 transition-transform brutalist-shadow whitespace-nowrap"
            >
              {isSaving ? '...' : 'save'}
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex-1 sm:flex-none px-5 py-3 bg-[#FDE047] border-2 border-black rounded-full font-extrabold hover:-translate-y-0.5 transition-transform brutalist-shadow whitespace-nowrap inline-flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4" />
              versions
            </button>
          </div>
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

      {/* Editor */}
      <div className="relative z-0">
        <ProfessionalEditor
          value={content}
          onChange={setContent}
          placeholder="write your note here..."
        />
      </div>

      <VersionHistoryModal
        open={historyOpen}
        loading={versionsLoading}
        versions={versions}
        onClose={() => setHistoryOpen(false)}
        onRestore={restoreVersion}
        onUndoLatest={undoLatestVersion}
      />
    </main>
  );
}