'use client';

import { X, RotateCcw, History } from 'lucide-react';

interface VersionItem {
  _id: string;
  title: string;
  createdAt: string;
}

interface VersionHistoryModalProps {
  open: boolean;
  loading: boolean;
  versions: VersionItem[];
  onClose: () => void;
  onRestore: (versionId: string) => Promise<void>;
  onUndoLatest: () => Promise<void>;
}

export default function VersionHistoryModal({
  open,
  loading,
  versions,
  onClose,
  onRestore,
  onUndoLatest,
}: VersionHistoryModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border-2 border-black rounded-[2rem] brutalist-shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <h2 className="text-xl font-extrabold">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border-2 border-black rounded-full hover:-translate-y-0.5 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <button
            onClick={onUndoLatest}
            disabled={loading || versions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#93C5FD] border-2 border-black rounded-full font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Undo last save
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <p className="text-sm font-semibold text-gray-500">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm font-semibold text-gray-500">No saved versions yet.</p>
          ) : (
            versions.map((version) => (
              <div key={version._id} className="flex items-center justify-between gap-3 border-2 border-black rounded-2xl px-4 py-3">
                <div>
                  <p className="font-bold text-sm line-clamp-1">{version.title}</p>
                  <p className="text-xs text-gray-500 font-semibold">
                    {new Date(version.createdAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => onRestore(version._id)}
                  className="px-4 py-2 bg-[#93EB7D] border-2 border-black rounded-full font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
