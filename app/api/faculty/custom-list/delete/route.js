// app/api/faculty/custom-list/delete/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import CustomList from "@/app/models/CustomList";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function DELETE(req) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    // Check authorization
    if (!user || !["cr", "admin", "faculty"].includes(user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return NextResponse.json({ success: false, message: "List ID is required" }, { status: 400 });
    }

    // Find the list
    const list = await CustomList.findById(listId);
    if (!list) {
      return NextResponse.json({ success: false, message: "List not found" }, { status: 404 });
    }

    // Optional: Ensure only the creator or admin can delete
    if (user.role === "cr" && list.createdBy.toString() !== user._id.toString()) {
       return NextResponse.json({ success: false, message: "You can only delete your own lists" }, { status: 403 });
    }

    // Delete the list
    await CustomList.findByIdAndDelete(listId);

    return NextResponse.json({ success: true, message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting list:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}