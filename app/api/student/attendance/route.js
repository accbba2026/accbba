// app/api/student/attendance/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");

    console.log("=== Attendance API Debug ===");
    console.log("Student ID:", studentId);
    console.log("Semester:", semester);

    if (!studentId || !semester) {
      return NextResponse.json(
        { success: false, message: "Student ID and semester are required" },
        { status: 400 }
      );
    }

    // Verify the student is requesting their own data
    if (studentId !== currentUser._id.toString()) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Step 1: Get ALL distinct dates (class days) for this semester
    // This tells us how many classes were held in total for the semester
    const allClassDates = await Attendance.distinct("date", { semester });
    console.log(`Total class days in ${semester} semester: ${allClassDates.length}`);
    console.log("Class dates:", allClassDates.sort());

    // Step 2: Get attendance records for this specific student
    const studentAttendance = await Attendance.find({
      semester,
      studentId
    })
      .populate("studentId", "name collegeId email")
      .populate("inputBy", "name")
      .sort({ date: 1 });

    console.log(`Student attendance records found: ${studentAttendance.length}`);

    // Step 3: Create a map of dates where student was present
    const presentDatesMap = new Map();
    studentAttendance.forEach(record => {
      presentDatesMap.set(record.date, record);
    });

    // Step 4: Build the complete attendance data for all class dates
    const groupedByDate = {};
    allClassDates.forEach(date => {
      if (presentDatesMap.has(date)) {
        groupedByDate[date] = [presentDatesMap.get(date)];
      } else {
        // Student was absent on this date
        groupedByDate[date] = [];
      }
    });

    // Step 5: Get sorted dates (oldest to newest for table display)
    const sortedDates = [...allClassDates].sort((a, b) => new Date(a) - new Date(b));

    const studentInfo = await User.findById(studentId).select("name collegeId email semester");

    return NextResponse.json({
      success: true,
      data: groupedByDate,
      dates: sortedDates,
      totalDates: allClassDates.length,
      studentInfo: {
        name: studentInfo?.name || currentUser.name,
        collegeId: studentInfo?.collegeId || currentUser.collegeId,
        semester: studentInfo?.semester || currentUser.semester,
      },
      debug: {
        totalClassDays: allClassDates.length,
        studentPresentDays: studentAttendance.length,
        absentDays: allClassDates.length - studentAttendance.length
      }
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}