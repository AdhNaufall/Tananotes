import { connectDB } from "../../../lib/mongodb";
import Schedule from "../../../models/Schedule";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const BG_COLORS = ['#93C5FD', '#FCA5A5', '#FEF08A', '#A7F3D0', '#B28DFF', '#93EB7D'];

// GET - fetch all schedules
export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const schedules = await Schedule.find({ ownerId: session.sub }).sort({ date: 1 });
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

// POST - create new schedule
export async function POST(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { title, date, color } = await request.json();
    if (!title || !date) {
      return NextResponse.json({ error: "title and date are required" }, { status: 400 });
    }
    const count = await Schedule.countDocuments();
    const resolvedColor = color || BG_COLORS[count % BG_COLORS.length];
    const schedule = await Schedule.create({ ownerId: session.sub, title, date, color: resolvedColor });
    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

// DELETE - delete schedule by id (?id=...)
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await Schedule.findOneAndDelete({ _id: id, ownerId: session.sub });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
