import { connectToDatabase } from "@/app/lib/mongodb";
import Assignment from "@/app/models/Assignment";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");

    const assignments = await Assignment.find({
      semester: semester || currentUser.semester,
      status: "published",
    }).populate("course", "courseName courseCode");

    // Sort assignments manually with custom logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedAssignments = assignments.sort((a, b) => {
      const dateA = new Date(a.submissionDate);
      const dateB = new Date(b.submissionDate);
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);

      const diffA = dateA - today;
      const diffB = dateB - today;

      // Check if expired
      const isExpiredA = diffA < 0;
      const isExpiredB = diffB < 0;

      // Expired assignments go to the bottom
      if (isExpiredA && !isExpiredB) return 1;
      if (!isExpiredA && isExpiredB) return -1;

      // Both expired: sort by most recent first (closer to today)
      if (isExpiredA && isExpiredB) {
        return dateB - dateA;
      }

      // Both not expired: sort by days remaining (ascending)
      return diffA - diffB;
    });

    return NextResponse.json({ success: true, data: sortedAssignments });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
