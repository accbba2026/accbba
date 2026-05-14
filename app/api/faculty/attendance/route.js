// app/api/faculty/attendance/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import Log from "@/app/models/Log";
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
      .sort({ date: 1, createdAt: 1 });

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
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Unauthorized Attendance Marking Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { date, semester, studentIds } = await request.json();

    if (!date || !semester || !studentIds || studentIds.length === 0) {
      const missingFields = [];
      if (!date) missingFields.push('date');
      if (!semester) missingFields.push('semester');
      if (!studentIds || studentIds.length === 0) missingFields.push('studentIds');
      
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Attendance Marking Failed - Missing Required Fields",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          missingFields: missingFields,
          providedData: {
            date: date || 'missing',
            semester: semester || 'missing',
            studentCount: studentIds?.length || 0
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Date, semester, and student IDs are required" },
        { status: 400 }
      );
    }

    // Get student details for logging
    const students = await User.find({ 
      _id: { $in: studentIds },
      role: { $in: ['student', 'cr'] }
    }).select('name collegeId email role semester');

    // Check if attendance already exists for this date and students
    const existingAttendance = await Attendance.find({
      date,
      semester,
      studentId: { $in: studentIds },
    }).populate("studentId", "name collegeId email");

    const existingStudentIds = new Set(existingAttendance.map(a => a.studentId._id.toString()));
    const existingStudentsDetails = existingAttendance.map(a => ({
      id: a.studentId._id,
      name: a.studentId.name,
      collegeId: a.studentId.collegeId,
      email: a.studentId.email,
      attendanceId: a._id,
      createdAt: a.createdAt
    }));
    
    // Filter out students who already have attendance
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id));
    const newStudentsDetails = students.filter(s => newStudentIds.includes(s._id.toString()));

    // Log attendance marking attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ATTENDANCE_MARK",
      resourceType: "attendance",
      details: JSON.stringify({
        action: "Attendance Marking Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        attendanceDetails: {
          date: date,
          semester: semester,
          totalAttempted: studentIds.length,
          newStudents: newStudentIds.length,
          alreadyPresent: existingStudentIds.size
        },
        studentsList: students.map(s => ({
          id: s._id,
          name: s.name,
          collegeId: s.collegeId,
          email: s.email,
          role: s.role
        })),
        existingRecords: existingStudentsDetails,
        timestamp: new Date().toISOString()
      })
    });

    if (newStudentIds.length === 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Attendance Marking - All Students Already Marked",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          attendanceDetails: {
            date: date,
            semester: semester,
            totalAttempted: studentIds.length,
            alreadyMarked: existingStudentIds.size,
            existingStudents: existingStudentsDetails
          },
          timestamp: new Date().toISOString()
        })
      });
      
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

    // Get details of newly added attendance records
    const newAttendanceRecords = await Attendance.find({
      _id: { $in: result.map(r => r._id) }
    }).populate("studentId", "name collegeId email");

    // Log successful attendance marking
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ATTENDANCE_MARK",
      resourceType: "attendance",
      details: JSON.stringify({
        action: "Attendance Marked Successfully",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        attendanceDetails: {
          date: date,
          semester: semester,
          totalAttempted: studentIds.length,
          successfullyAdded: result.length,
          alreadyPresent: existingStudentIds.size
        },
        studentsAdded: newStudentsDetails.map(s => ({
          id: s._id,
          name: s.name,
          collegeId: s.collegeId,
          email: s.email,
          role: s.role
        })),
        attendanceRecords: newAttendanceRecords.map(record => ({
          id: record._id,
          studentId: record.studentId._id,
          studentName: record.studentId.name,
          studentCollegeId: record.studentId.collegeId,
          createdAt: record.createdAt
        })),
        existingStudents: existingStudentsDetails,
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json({
      success: true,
      message: `Attendance added for ${result.length} student(s)`,
      addedCount: result.length,
      alreadyExists: existingStudentIds.size,
    });
  } catch (error) {
    console.error("Error adding attendance:", error);
    
    // Log error with details
    try {
      const { date, semester, studentIds } = await request.json().catch(() => ({}));
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Attendance Marking Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedData: {
            date: date,
            semester: semester,
            studentCount: studentIds?.length || 0
          },
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
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
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ATTENDANCE_DELETE",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Unauthorized Attendance Deletion Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get("id");

    if (!attendanceId) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ATTENDANCE_DELETE",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Attendance Deletion Failed - Missing ID",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Attendance ID is required" },
        { status: 400 }
      );
    }

    // Get attendance record with student details before deletion
    const attendance = await Attendance.findById(attendanceId)
      .populate("studentId", "name collegeId email phone role")
      .populate("inputBy", "name collegeId");

    if (!attendance) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ATTENDANCE_DELETE",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Attendance Deletion Failed - Record Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          attendanceId: attendanceId,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Log deletion attempt with student info
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ATTENDANCE_DELETE",
      resourceType: "attendance",
      resourceId: attendanceId,
      details: JSON.stringify({
        action: "Attendance Deletion Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        attendanceRecord: {
          id: attendance._id,
          date: attendance.date,
          semester: attendance.semester,
          student: {
            id: attendance.studentId?._id,
            name: attendance.studentId?.name,
            collegeId: attendance.studentId?.collegeId,
            email: attendance.studentId?.email,
            phone: attendance.studentId?.phone,
            role: attendance.studentId?.role
          },
          markedBy: {
            id: attendance.inputBy?._id,
            name: attendance.inputBy?.name,
            collegeId: attendance.inputBy?.collegeId
          },
          createdAt: attendance.createdAt
        },
        timestamp: new Date().toISOString()
      })
    });

    await Attendance.findByIdAndDelete(attendanceId);

    // Log successful deletion
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ATTENDANCE_DELETE",
      resourceType: "attendance",
      resourceId: attendanceId,
      details: JSON.stringify({
        action: "Attendance Deleted Successfully",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        deletedRecord: {
          id: attendance._id,
          date: attendance.date,
          semester: attendance.semester,
          student: {
            id: attendance.studentId?._id,
            name: attendance.studentId?.name,
            collegeId: attendance.studentId?.collegeId,
            email: attendance.studentId?.email,
            phone: attendance.studentId?.phone,
            role: attendance.studentId?.role
          },
          markedBy: {
            id: attendance.inputBy?._id,
            name: attendance.inputBy?.name,
            collegeId: attendance.inputBy?.collegeId
          },
          markedAt: attendance.createdAt,
          deletedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    
    // Log error with details
    try {
      const { searchParams } = new URL(request.url);
      const attendanceId = searchParams.get("id");
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ATTENDANCE_DELETE",
        resourceType: "attendance",
        resourceId: attendanceId,
        details: JSON.stringify({
          action: "Attendance Deletion Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attendanceId: attendanceId,
          error: {
            name: error.name,
            message: error.message,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}