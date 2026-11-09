// app/api/cr/custom-list/get-single/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import CustomList from "@/app/models/CustomList";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(req) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    if (!user || !["cr", "admin", "faculty"].includes(user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return NextResponse.json({ success: false, message: "List ID is required" }, { status: 400 });
    }

    const list = await CustomList.findById(listId).populate(
      "rows.studentId",
      "name collegeId phone semester"
    );

    if (!list) {
      return NextResponse.json({ success: false, message: "List not found" }, { status: 404 });
    }

    // ✅ SECURITY CHECK: Restrict CRs to only their own lists
    if (user.role === "cr" && list.createdBy.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view this list." },
        { status: 403 }
      );
    }

    const listData = list.toObject({ flattenMaps: true });
    
    // Fallback for manual entries
    listData.rows = listData.rows.map(row => {
      if (!row.studentId) {
         row.studentId = { name: "", collegeId: "", phone: "" }; 
      }
      return row;
    });

    return NextResponse.json({ success: true, data: listData });
  } catch (error) {
    console.error("Error fetching list:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}