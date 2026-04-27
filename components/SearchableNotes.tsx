"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Pin, Filter, X, SortAsc, ChevronDown,
  LayoutGrid, List, Calendar, Tag,
  Clock, History, PenLine, ArrowDownAZ, ArrowUpAZ, Check,
  type LucideIcon
} from 'lucide-react';
import { buildSmartSummary, stripHtmlToText } from '@/lib/noteSummary';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Note {
  _id: string;
  title: string;
  category: string;
  content: string;
  slug: string;
  color?: string;
  isPinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type SortOption  = 'newest' | 'oldest' | 'updated' | 'az' | 'za';
type DatePreset  = 'all' | 'today' | 'week' | 'month';
type ViewMode    = 'grid' | 'list';

// ─── Palette & helpers ────────────────────────────────────────────────────────
const PALETTE = ['#93C5FD', '#FCA5A5', '#FEF08A', '#A7F3D0', '#FF6B6B', '#93EB7D', '#B28DFF'];

function buildCategoryMap(notes: Note[]) {
  const map = new Map<string, string>();
  let idx = 0;
  notes.forEach(n => {
    if (!n.category) return;
    if (!map.has(n.category)) map.set(n.category, (n.color && n.color !== '#ffffff') ? n.color : '');
    else if (n.color && n.color !== '#ffffff' && !map.get(n.category)) map.set(n.category, n.color);
  });
  Array.from(map.keys()).sort().forEach(cat => {
    if (!map.get(cat)) { map.set(cat, PALETTE[idx % PALETTE.length]); idx++; }
  });
  return map;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part)
            ? <mark key={i} className="bg-yellow-300 rounded-[3px] font-bold not-italic px-0.5">{part}</mark>
            : part
        )}
      </>
    );
  } catch { return text; }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: LucideIcon }[] = [
  { value: 'newest',  label: 'Terbaru',       icon: Clock        },
  { value: 'oldest',  label: 'Terlama',       icon: History      },
  { value: 'updated', label: 'Baru diupdate', icon: PenLine      },
  { value: 'az',      label: 'A → Z',         icon: ArrowDownAZ  },
  { value: 'za',      label: 'Z → A',         icon: ArrowUpAZ    },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all',   label: 'Semua waktu' },
  { value: 'today', label: 'Hari ini'    },
  { value: 'week',  label: '7 Hari'      },
  { value: 'month', label: '30 Hari'     },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SearchableNotes({ allNotes: initialNotes }: { allNotes: Note[] }) {
  const [allNotes,           setAllNotes]           = useState(initialNotes);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pinnedOnly,         setPinnedOnly]         = useState(false);
  const [datePreset,         setDatePreset]         = useState<DatePreset>('all');
  const [sortBy,             setSortBy]             = useState<SortOption>('newest');
  const [viewMode,           setViewMode]           = useState<ViewMode>('grid');
  const [isFilterOpen,       setIsFilterOpen]       = useState(false);
  const [isSortOpen,         setIsSortOpen]         = useState(false);

  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!isSortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isSortOpen]);

  const categoryMap = useMemo(() => buildCategoryMap(allNotes), [allNotes]);
  const categories  = useMemo(() => Array.from(categoryMap.keys()).sort(), [categoryMap]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }, []);

  const getDateRange = (preset: DatePreset) => {
    const now = new Date();
    if (preset === 'today') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { from: s, to: now };
    }
    if (preset === 'week') {
      const s = new Date(now); s.setDate(now.getDate() - 7);
      return { from: s, to: now };
    }
    if (preset === 'month') {
      const s = new Date(now); s.setMonth(now.getMonth() - 1);
      return { from: s, to: now };
    }
    return null;
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...allNotes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        stripHtmlToText(n.content).toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(n => selectedCategories.includes(n.category));
    }

    if (pinnedOnly) {
      result = result.filter(n => n.isPinned);
    }

    const range = getDateRange(datePreset);
    if (range) {
      result = result.filter(n => {
        if (!n.createdAt) return true;
        const d = new Date(n.createdAt);
        return d >= range.from && d <= range.to;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':  return new Date(b.createdAt  || 0).getTime() - new Date(a.createdAt  || 0).getTime();
        case 'oldest':  return new Date(a.createdAt  || 0).getTime() - new Date(b.createdAt  || 0).getTime();
        case 'updated': return new Date(b.updatedAt  || 0).getTime() - new Date(a.updatedAt  || 0).getTime();
        case 'az':      return a.title.localeCompare(b.title);
        case 'za':      return b.title.localeCompare(a.title);
        default:        return 0;
      }
    });

    // Pinned always first (except A-Z / Z-A sorts)
    if (sortBy === 'newest' || sortBy === 'oldest' || sortBy === 'updated') {
      result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    }

    return result;
  }, [allNotes, searchQuery, selectedCategories, pinnedOnly, datePreset, sortBy]);

  const activeFilterCount = [
    selectedCategories.length > 0,
    pinnedOnly,
    datePreset !== 'all',
  ].filter(Boolean).length;

  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setPinnedOnly(false);
    setDatePreset('all');
    setSortBy('newest');
  };

  const togglePin = async (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch('/api/notes/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAllNotes(prev => prev.map(n => n._id === noteId ? { ...n, isPinned: updated.isPinned } : n));
      }
    } catch { /* silent */ }
  };

  const currentSortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label ?? 'Terbaru';

  return (
    <div className="space-y-4 pb-32">

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Cari judul, isi, atau kategori..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-black font-semibold text-[15px] bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] shadow-[3px_3px_0px_rgba(0,0,0,1)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
        )}
      </div>

      {/* ── Toolbar Row ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Filter button */}
        <button
          onClick={() => { setIsFilterOpen(v => !v); setIsSortOpen(false); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-black font-bold text-[13px] transition-all select-none
            ${isFilterOpen || activeFilterCount > 0
              ? 'bg-black text-white shadow-none translate-y-[1px]'
              : 'bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px]'}`}
        >
          <Filter className="w-4 h-4" strokeWidth={2.5} />
          Filter
          {activeFilterCount > 0 && (
            <span className="bg-[#93C5FD] text-black rounded-full w-5 h-5 text-[11px] flex items-center justify-center font-extrabold leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort dropdown */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => { setIsSortOpen(v => !v); setIsFilterOpen(false); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-black font-bold text-[13px] transition-all select-none
              ${isSortOpen
                ? 'bg-black text-white shadow-none translate-y-[1px]'
                : 'bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px]'}`}
          >
            <SortAsc className="w-4 h-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">{currentSortLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSortOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] z-50 min-w-[180px]">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors
                    ${sortBy === opt.value ? 'bg-[#93C5FD]' : ''}`}
                >
                  <opt.icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {opt.label}
                  {sortBy === opt.value && <Check className="ml-auto w-4 h-4 shrink-0" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center border-2 border-black rounded-xl overflow-hidden shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
          >
            <LayoutGrid className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`p-2.5 border-l-2 border-black transition-colors ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
          >
            <List className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Filter Panel ───────────────────────────────────────────────────── */}
      {isFilterOpen && (
        <div className="bg-white border-2 border-black rounded-2xl p-5 space-y-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">

          {/* Category multi-select */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              <p className="text-[11px] font-extrabold text-gray-500 tracking-widest uppercase">Kategori</p>
            </div>
            {categories.length === 0 ? (
              <p className="text-[13px] text-gray-400 font-semibold">Belum ada kategori.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const isActive = selectedCategories.includes(cat);
                  const bg = categoryMap.get(cat) || '#ffffff';
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      style={{ backgroundColor: isActive ? bg : 'white' }}
                      className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border-2 border-black font-bold text-[12px] transition-all
                        ${isActive ? 'shadow-none translate-y-[1px]' : 'shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px]'}`}
                    >
                      {cat}
                      {isActive && <X className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date presets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              <p className="text-[11px] font-extrabold text-gray-500 tracking-widest uppercase">Tanggal Dibuat</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  className={`px-4 py-1.5 rounded-full border-2 border-black font-bold text-[12px] transition-all
                    ${datePreset === p.value
                      ? 'bg-black text-white shadow-none'
                      : 'bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px]'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pinned toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
              <p className="text-[12px] font-extrabold text-gray-500 tracking-wide">Hanya Pinned</p>
            </div>
            <button
              onClick={() => setPinnedOnly(v => !v)}
              className={`relative w-12 h-6 rounded-full border-2 border-black transition-colors duration-200 ${pinnedOnly ? 'bg-[#FDE047]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full border-2 border-black transition-all duration-200 ${pinnedOnly ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSelectedCategories([]); setPinnedOnly(false); setDatePreset('all'); }}
              className="w-full py-2.5 rounded-xl border-2 border-black font-bold text-[13px] bg-white hover:bg-red-50 hover:text-red-600 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              Hapus Semua Filter
            </button>
          )}
        </div>
      )}

      {/* ── Active Filter Chips ────────────────────────────────────────────── */}
      {activeFilterCount > 0 && !isFilterOpen && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map(cat => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-[12px] font-bold"
              style={{ backgroundColor: categoryMap.get(cat) || '#E2E8F0' }}
            >
              {cat}
              <button onClick={() => toggleCategory(cat)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {pinnedOnly && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-[12px] font-bold bg-[#FDE047]">
              📌 Pinned
              <button onClick={() => setPinnedOnly(false)}><X className="w-3 h-3" /></button>
            </span>
          )}
          {datePreset !== 'all' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-[12px] font-bold bg-[#A7F3D0]">
              📅 {DATE_PRESETS.find(p => p.value === datePreset)?.label}
              <button onClick={() => setDatePreset('all')}><X className="w-3 h-3" /></button>
            </span>
          )}
          <button
            onClick={() => { setSelectedCategories([]); setPinnedOnly(false); setDatePreset('all'); }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-[12px] font-bold bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
          >
            <X className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* ── Results Summary ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[13px] font-bold text-gray-500">
          {filteredAndSorted.length}
          <span className="font-semibold text-gray-400"> dari </span>
          {allNotes.length}
          <span className="font-semibold text-gray-400"> catatan</span>
        </p>
        {hasAnyFilter && (
          <button onClick={clearAllFilters} className="text-[12px] font-bold text-red-500 hover:text-red-700 transition-colors">
            Reset semua
          </button>
        )}
      </div>

      {/* ── Notes Output ──────────────────────────────────────────────────── */}
      {filteredAndSorted.length === 0 ? (

        <div className="text-center py-16 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-extrabold mb-2">Tidak ada catatan ditemukan</h3>
          <p className="text-gray-500 font-semibold text-sm mb-5 px-8">
            Coba ubah kata kunci atau filter yang aktif.
          </p>
          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-[#93C5FD] border-2 border-black rounded-full font-bold text-sm shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              Hapus semua filter
            </button>
          )}
        </div>

      ) : viewMode === 'grid' ? (

        /* ── Grid View ─────────────────────────────────────────────────── */
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSorted.map(note => {
            const bgColor = categoryMap.get(note.category) || '#ffffff';
            const summary = buildSmartSummary(note.content, { maxLength: 190 });
            return (
              <Link
                key={note._id}
                href={`/notes/${note.slug}`}
                className="flex flex-col rounded-2xl border-2 border-black p-4 relative overflow-hidden transition-all hover:-translate-y-[2px] shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] h-[220px]"
                style={{ backgroundColor: bgColor }}
              >
                {/* Pin */}
                <button
                  onClick={e => togglePin(e, note._id)}
                  className={`absolute top-3 right-3 w-7 h-7 rounded-full border-2 border-black flex items-center justify-center z-10 transition-all
                    ${note.isPinned ? 'rotate-12 bg-[#FDE047]' : 'bg-white hover:scale-110'}`}
                >
                  <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-black' : ''}`} strokeWidth={2.5} />
                </button>

                <h3 className="font-bold text-[15px] leading-snug line-clamp-2 mb-1.5 pr-8">
                  {highlightText(note.title, searchQuery)}
                </h3>
                {summary.headings[0] && (
                  <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-70 mb-1.5 line-clamp-1">
                    Fokus: {highlightText(summary.headings[0], searchQuery)}
                  </p>
                )}
                <div className="text-[12px] font-medium opacity-60 line-clamp-4 leading-relaxed flex-1">
                  {highlightText(summary.preview, searchQuery)}
                </div>
                <div className="mt-auto pt-2 flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-black border border-black bg-white/80 px-2.5 py-1 rounded-full truncate max-w-[55%]">
                    {note.category}
                  </span>
                  {note.createdAt && (
                    <span className="text-[10px] font-semibold text-black/40 shrink-0">
                      {formatDate(note.createdAt)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

      ) : (

        /* ── List View ─────────────────────────────────────────────────── */
        <div className="space-y-2.5">
          {filteredAndSorted.map(note => {
            const bgColor = categoryMap.get(note.category) || '#ffffff';
            const summary = buildSmartSummary(note.content, { maxLength: 165 });
            return (
              <Link
                key={note._id}
                href={`/notes/${note.slug}`}
                className="flex items-start gap-3 rounded-2xl border-2 border-black p-4 relative bg-white transition-all hover:-translate-y-[1px] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)]"
                style={{ borderLeftColor: bgColor, borderLeftWidth: '6px' }}
              >
                {/* Colour dot */}
                <div className="w-3 h-3 mt-1 rounded-full border-2 border-black shrink-0" style={{ backgroundColor: bgColor }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-[15px] leading-snug line-clamp-1 flex-1">
                      {highlightText(note.title, searchQuery)}
                    </h3>
                    {note.isPinned && (
                      <Pin className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" strokeWidth={2} />
                    )}
                  </div>
                  {summary.headings[0] && (
                    <p className="text-[10px] text-gray-600 font-extrabold uppercase tracking-wide line-clamp-1 mb-1">
                      Fokus: {highlightText(summary.headings[0], searchQuery)}
                    </p>
                  )}
                  <p className="text-[12px] text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                    {highlightText(summary.preview, searchQuery)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[11px] font-bold text-black border border-black px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: bgColor }}
                    >
                      {note.category}
                    </span>
                    {note.createdAt && (
                      <span className="text-[11px] font-semibold text-gray-400">{formatDate(note.createdAt)}</span>
                    )}
                  </div>
                </div>

                {/* Pin toggle */}
                <button
                  onClick={e => togglePin(e, note._id)}
                  className={`shrink-0 w-7 h-7 rounded-full border-2 border-black flex items-center justify-center transition-all
                    ${note.isPinned ? 'rotate-12 bg-[#FDE047]' : 'bg-gray-100 hover:scale-110'}`}
                >
                  <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-black' : ''}`} strokeWidth={2.5} />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
