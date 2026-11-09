// app/api/cr/search-all-students/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || !["cr", "admin", "faculty"].includes(currentUser.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Search by name or collegeId across ALL semesters
    const regex = new RegExp(query, "i");
    const students = await User.find({
      $or: [{ name: regex }, { collegeId: regex }],
      collegeId: { $exists: true, $nin: [null, ""] },
      role: { $in: ["student", "cr"] },
    })
      .select("name collegeId phone semester session")
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}