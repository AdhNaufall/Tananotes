"use client";

import Link from 'next/link';
import PinButton from './PinButton';
import { buildSmartSummary } from '@/lib/noteSummary';

interface Note {
  _id: string;
  title: string;
  category: string;
  content: string;
  slug: string;
  isPinned?: boolean;
  createdAt?: string;
}

interface NoteCardProps {
  note: Note;
  onPinToggle?: (noteId: string, isPinned: boolean) => void;
}

export default function NoteCard({ note, onPinToggle }: NoteCardProps) {
  const summary = buildSmartSummary(note.content || '', { maxLength: 120 });

  return (
    <Link key={note._id} href={`/notes/${note.slug}`}>
      <div className="glass-panel rounded-3xl p-6 glass-card-hover group relative">
        <PinButton 
          noteId={note._id} 
          isPinned={note.isPinned || false} 
          onToggle={onPinToggle}
        />
        
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-extrabold text-sky-900 group-hover:text-sky-700 transition-colors text-xl">
            {note.title}
          </h3>
          <span className="text-sm bg-sky-500 text-white px-4 py-1.5 rounded-full font-bold shadow-md">
            {note.category}
          </span>
        </div>
        <p className="text-sky-900 text-base font-semibold line-clamp-2 leading-relaxed mb-3">
          {summary.preview}
        </p>
        {note.createdAt && (
          <p className="text-sm text-sky-700 font-bold">
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}
      </div>
    </Link>
  );
}
