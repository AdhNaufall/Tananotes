import mongoose, { Schema, Document } from 'mongoose';

export interface INoteDraft extends Document {
  scope: string;
  noteId?: string;
  title: string;
  category: string;
  content: string;
  color: string;
  updatedAt: Date;
}

const NoteDraftSchema: Schema = new Schema({
  scope: { type: String, required: true, unique: true, index: true },
  noteId: { type: String, default: null },
  title: { type: String, default: '' },
  category: { type: String, default: '' },
  content: { type: String, default: '' },
  color: { type: String, default: '#ffffff' },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.NoteDraft || mongoose.model<INoteDraft>('NoteDraft', NoteDraftSchema);