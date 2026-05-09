// app/api/faculty/get-students/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "faculty" && currentUser.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");

    if (!semester) {
      return NextResponse.json(
        { success: false, message: "Semester is required" },
        { status: 400 }
      );
    }

    // Fetch students for the specific semester
    const students = await User.find({
      semester: semester,
      role: { $in: ["student", "cr"] },
      status: "active",
      collegeId: { $exists: true, $ne: null, $ne: "" },
    })
      .select("name collegeId email phone semester role _id")
      .sort({ collegeId: 1 });

    console.log(`Found ${students.length} students for semester ${semester}`);
    
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