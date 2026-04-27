import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  ownerId: string;
  title: string;
  date: string;
  color: string;
}

const ScheduleSchema: Schema = new Schema({
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  date:  { type: String, required: true },
  color: { type: String, default: '#93C5FD' },
}, { timestamps: true });

export default mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', ScheduleSchema);
