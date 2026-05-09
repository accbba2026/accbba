// app/api/faculty/assignments/bulk-submit/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import AssignmentSubmission from "@/app/models/AssignmentSubmission";
import Assignment from "@/app/models/Assignment";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "faculty" && currentUser.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { assignmentId, studentIds, submissionDate } = await request.json();

    if (!assignmentId || !studentIds || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Assignment ID and student IDs are required" },
        { status: 400 }
      );
    }

    // Get assignment to check due date
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    const dueDate = new Date(assignment.submissionDate);
    const submittedDate = submissionDate ? new Date(submissionDate) : new Date();
    
    // Determine if submission is on time or late
    const status = submittedDate <= dueDate ? "onTime" : "late";

    // Prepare bulk operations
    const bulkOps = studentIds.map((studentId) => ({
      updateOne: {
        filter: { assignment: assignmentId, student: studentId },
        update: {
          $set: {
            assignment: assignmentId,
            student: studentId,
            submittedAt: submittedDate,
            status: status,
          },
        },
        upsert: true,
      },
    }));

    const result = await AssignmentSubmission.bulkWrite(bulkOps);

    // Update totalSubmissions count in assignment
    const totalSubmissions = await AssignmentSubmission.countDocuments({
      assignment: assignmentId,
    });
    await Assignment.findByIdAndUpdate(assignmentId, { totalSubmissions });

    return NextResponse.json({
      success: true,
      message: `Successfully submitted for ${studentIds.length} student(s)`,
      submittedCount: studentIds.length,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });
  } catch (error) {
    console.error("Error in bulk submission:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}