// app/api/cr/assignments/create/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import Assignment from "@/app/models/Assignment";
import Course from "@/app/models/Course";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      chapter,
      semester,
      course,
      pdfUrl,
      pdfPublicId,
      pdfFileName,
      pdfFileSize,
      submissionDate,
      dueDate,
      instructions,
      resources,
    } = body;

    // Verify course belongs to CR's semester
    const courseData = await Course.findById(course);
    if (!courseData) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    if (courseData.semester !== currentUser.semester) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only create assignments for your semester",
        },
        { status: 403 },
      );
    }

    // Prepare assignment data (only include PDF fields if they exist)
    const assignmentData = {
      title,
      description,
      chapter,
      semester: currentUser.semester,
      course,
      courseName: courseData.courseName,
      courseCode: courseData.courseCode,
      teacher: currentUser.id,
      teacherName: currentUser.name,
      submissionDate,
      dueDate,
      instructions: instructions || "",
      resources: resources || [],
      status: "published",
    };

    // Only add PDF fields if they exist
    if (pdfUrl) {
      assignmentData.pdfUrl = pdfUrl;
      assignmentData.pdfPublicId = pdfPublicId;
      assignmentData.pdfFileName = pdfFileName;
      assignmentData.pdfFileSize = pdfFileSize;
    }

    const assignment = await Assignment.create(assignmentData);

    return NextResponse.json(
      { success: true, data: assignment },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
