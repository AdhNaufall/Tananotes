"use client";

import { useState } from 'react';
import { Pin } from 'lucide-react';

interface PinButtonProps {
  noteId: string;
  isPinned: boolean;
  onToggle?: (noteId: string, newPinnedState: boolean) => void;
  className?: string;
}

export default function PinButton({ noteId, isPinned, onToggle, className = "" }: PinButtonProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [pinned, setPinned] = useState(isPinned);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsToggling(true);
    
    try {
      const response = await fetch('/api/notes/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId })
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setPinned(updatedNote.isPinned);
        onToggle?.(noteId, updatedNote.isPinned);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`absolute top-0 right-6 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform transition-all z-10
        ${pinned 
          ? 'bg-amber-100 border-2 border-amber-300 rotate-12 scale-100' 
          : 'bg-white border-2 border-sky-300 opacity-0 group-hover:opacity-100 hover:scale-110'
        } 
        ${isToggling ? 'animate-pulse' : 'hover:rotate-12'} ${className}`}
      title={pinned ? "Unpin note" : "Pin note"}
    >
      <Pin className={`w-5 h-5 transition-colors ${pinned ? 'text-amber-500 fill-amber-500' : 'text-sky-600'}`} />
    </button>
  );
}
