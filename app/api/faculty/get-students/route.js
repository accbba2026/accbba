// app/api/faculty/get-students/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (
      !currentUser ||
      (currentUser.role !== "faculty" && currentUser.role !== "admin")
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");
    const major = searchParams.get("major"); // ✅ optional

    if (!semester) {
      return NextResponse.json(
        { success: false, message: "Semester is required" },
        { status: 400 }
      );
    }

    const query = {
      semester,
      role: { $in: ["student", "cr"] },
      status: "active",
      collegeId: { $exists: true, $nin: [null, ""] },
    };

    // ✅ Only filter by major when explicitly provided.
    // If omitted, return students of ALL majors in this semester.
    if (major) {
      query.major = major;
    }

    const students = await User.find(query)
      .select(
        "name collegeId email phone semester role major bloodGroup session comments _id"
      )
      .sort({ collegeId: 1 });

    return NextResponse.json({
      success: true,
      data: students,
      count: students.length,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}