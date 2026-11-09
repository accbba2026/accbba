// app/api/cr/custom-list/create/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import CustomList from "@/app/models/CustomList";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function POST(req) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    // ✅ Only CR, faculty, or admin can create lists
    if (!user || !["cr", "admin", "faculty"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { title } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Title is required" },
        { status: 400 }
      );
    }

    // Create the list with just the title initially
    const newList = await CustomList.create({
      title: title.trim(),
      columns: [], // Starts empty
      rows: [], // Starts empty
      createdBy: user._id,
    });

    return NextResponse.json({ success: true, data: newList }, { status: 201 });
  } catch (error) {
    console.error("Error creating list:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}