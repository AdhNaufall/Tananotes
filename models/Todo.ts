import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  ownerId: string;
  text: string;
  completed: boolean;
}

const TodoSchema: Schema = new Schema({
  ownerId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);
