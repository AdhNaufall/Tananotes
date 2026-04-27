"use client";

import { useState } from 'react';
import NoteCard from './NoteCard';

interface Note {
  _id: string;
  title: string;
  category: string;
  content: string;
  slug: string;
  isPinned?: boolean;
  createdAt?: string;
}

interface RecentNotesListProps {
  initialNotes: Note[];
}

export default function RecentNotesList({ initialNotes }: RecentNotesListProps) {
  const [notes, setNotes] = useState(initialNotes);

  const handlePinToggle = (noteId: string, isPinned: boolean) => {
    setNotes(prev => {
      const updated = prev.map(note => 
        note._id === noteId ? { ...note, isPinned } : note
      );
      
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    });
  };

  return (
    <div className="grid gap-5">
      {notes.map((note) => (
        <NoteCard key={note._id} note={note} onPinToggle={handlePinToggle} />
      ))}
    </div>
  );
}
