// app/api/faculty/custom-list/get-all/route.js
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

    // ✅ Admin sees all lists. Faculty and CRs only see their own.
    const query = user.role === "admin" ? {} : { createdBy: user._id };

    // ✅ Populate the creator's details to show the author name
    const lists = await CustomList.find(query)
      .populate("createdBy", "name role")
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, data: lists });
  } catch (error) {
    console.error("Error fetching lists:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}