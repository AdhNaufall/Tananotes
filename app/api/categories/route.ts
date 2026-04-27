import { connectDB } from "../../../lib/mongodb"; 
import Note from "../../../models/Note";           
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// GET - Fetch all unique categories from notes with their corresponding colors
export async function GET(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoriesDb = await Note.aggregate([
      { $match: { ownerId: session.sub, category: { $nin: [null, ''] }, isDeleted: { $ne: true } } },
      { $group: { _id: '$category', colors: { $push: '$color' } } }
    ]);
    
    // Sort so it's deterministic fallback
    categoriesDb.sort((a, b) => a._id.localeCompare(b._id));
    
    const categories = categoriesDb.map(cat => {
      // Find first non-white color
      const color = cat.colors.find((c: string) => c && c !== '#ffffff') || '#ffffff';
      
      return { name: cat._id, color: color };
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    await connectDB();
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category } = await request.json();
    
    if (!category || category.trim() === '') {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }
    // Check if category already exists
    const existingCategory = await Note.findOne({ ownerId: session.sub, category: category.trim(), isDeleted: { $ne: true } });
    
    return NextResponse.json({ 
      message: existingCategory ? "Category already exists" : "Category will be created with first note",
      category: category.trim()
    });
  } catch (error) {
    console.error("Error handling category:", error);
    return NextResponse.json({ error: "Failed to handle category" }, { status: 500 });
  }
}