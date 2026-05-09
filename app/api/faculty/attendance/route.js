// app/api/faculty/attendance/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

// GET attendance records
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!semester) {
      return NextResponse.json(
        { success: false, message: "Semester is required" },
        { status: 400 }
      );
    }

    const query = { semester };
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Get all attendance records for the semester within date range
    const attendance = await Attendance.find(query)
      .populate("studentId", "name collegeId email")
      .populate("inputBy", "name")
      .sort({ date: 1, createdAt: 1 }); // Sort by date ascending

    // Group by date
    const groupedByDate = attendance.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});

    // Get unique dates sorted
    const dates = Object.keys(groupedByDate).sort();

    return NextResponse.json({
      success: true,
      data: groupedByDate,
      dates: dates,
      totalDates: dates.length,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST - Add attendance for multiple students
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

    const { date, semester, studentIds } = await request.json();

    if (!date || !semester || !studentIds || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Date, semester, and student IDs are required" },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this date and students
    const existingAttendance = await Attendance.find({
      date,
      semester,
      studentId: { $in: studentIds },
    });

    const existingStudentIds = new Set(existingAttendance.map(a => a.studentId.toString()));
    
    // Filter out students who already have attendance
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id));

    if (newStudentIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Attendance already marked for all selected students",
        addedCount: 0,
        alreadyExists: existingStudentIds.size,
      });
    }

    // Create attendance records for new students
    const attendanceRecords = newStudentIds.map(studentId => ({
      date,
      studentId,
      semester,
      inputBy: currentUser._id,
    }));

    const result = await Attendance.insertMany(attendanceRecords);

    return NextResponse.json({
      success: true,
      message: `Attendance added for ${result.length} student(s)`,
      addedCount: result.length,
      alreadyExists: existingStudentIds.size,
    });
  } catch (error) {
    console.error("Error adding attendance:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove attendance record
export async function DELETE(request) {
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
    const attendanceId = searchParams.get("id");

    if (!attendanceId) {
      return NextResponse.json(
        { success: false, message: "Attendance ID is required" },
        { status: 400 }
      );
    }

    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 }
      );
    }

    await Attendance.findByIdAndDelete(attendanceId);

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}