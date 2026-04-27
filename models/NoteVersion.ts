import mongoose, { Schema, Document } from 'mongoose';

export interface INoteVersion extends Document {
  ownerId: string;
  noteId: string;
  noteSlug: string;
  title: string;
  category: string;
  content: string;
  slug: string;
  color: string;
  isPinned: boolean;
}

const NoteVersionSchema: Schema = new Schema({
  ownerId: { type: String, required: true, index: true },
  noteId: { type: String, required: true, index: true },
  noteSlug: { type: String, required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  content: { type: String, required: true },
  slug: { type: String, required: true },
  color: { type: String, default: '#ffffff' },
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

NoteVersionSchema.index({ ownerId: 1, noteId: 1, createdAt: -1 });

export default mongoose.models.NoteVersion || mongoose.model<INoteVersion>('NoteVersion', NoteVersionSchema);