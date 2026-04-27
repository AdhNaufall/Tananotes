import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  ownerId: string;
  title: string;
  category: string;
  content: string;
  slug: string;
  isPinned: boolean;
  color: string;
  images: string[];
  isDeleted: boolean;
  deletedAt?: Date;
}

const NoteSchema: Schema = new Schema({
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  content: { type: String, required: true },
  slug: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  color: { type: String, default: '#ffffff' },
  images: { type: [String], default: [] },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

NoteSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
NoteSchema.index(
  { title: 'text', category: 'text', content: 'text' },
  {
    name: 'note_full_text_search',
    weights: {
      title: 10,
      category: 5,
      content: 1,
    },
  }
);

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);