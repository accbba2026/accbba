// app/api/cr/get-students/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester") || currentUser.semester;
    const majorQuery = searchParams.get("major"); // optional override

    const query = {
      collegeId: { $exists: true, $nin: [null, ""] },
      semester,
      role: { $in: ["student", "cr"] },
    };

    // ✅ Apply major filter only if explicitly requested.
    // If omitted, return students of ALL majors in this semester.
    if (majorQuery) {
      query.major = majorQuery;
    }

    const students = await User.find(query)
      .select(
        "name collegeId phone email major semester role bloodGroup comments session"
      )
      .sort({ collegeId: 1 });

    const studentsWithFlag = students.map((student) => ({
      ...student.toObject(),
      isCR: student._id.toString() === currentUser._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: studentsWithFlag,
      count: studentsWithFlag.length,
    });
  } catch (error) {
    console.error("Error fetching students for CR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}