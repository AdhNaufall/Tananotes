import { connectDB } from "../../../lib/mongodb";
import Todo from "../../../models/Todo";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// GET - fetch all todos
export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const todos = await Todo.find({ ownerId: session.sub }).sort({ createdAt: 1 });
    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

// POST - create new todo
export async function POST(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { text, completed } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const todo = await Todo.create({ ownerId: session.sub, text, completed: completed || false });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}

// PATCH - update todo (toggle completed or edit text)
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    
    const updates = await request.json();
    const todo = await Todo.findOneAndUpdate(
      { _id: id, ownerId: session.sub },
      updates,
      { returnDocument: 'after' }
    );
    
    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }
    
    return NextResponse.json(todo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

// DELETE - delete todo by id (?id=...)
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
    await Todo.findOneAndDelete({ _id: id, ownerId: session.sub });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}
