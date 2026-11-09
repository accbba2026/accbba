// app/api/cr/custom-list/get-all/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import CustomList from "@/app/models/CustomList";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET() {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    if (!user || !["cr", "admin", "faculty"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch lists created by this user (or all lists if admin/faculty)
    // For CRs, they usually only see their own lists, or you can remove the filter to let everyone see all lists.
    const query = ["admin", "faculty"].includes(user.role)
      ? {}
      : { createdBy: user._id };

    // Sort by last updated descending
    const lists = await CustomList.find(query).sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}