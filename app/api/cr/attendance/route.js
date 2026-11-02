// app/api/cr/attendance/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import Log from "@/app/models/Log";
import ClassSession from "@/app/models/ClassSession";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

const SENIOR_SEMESTERS = ["7th", "8th"];

// ============================================================
// GET — list attendance
//   • 1st–6th   → legacy flow
//   • 7th/8th   → session-based flow
//   ✅ major is now OPTIONAL — CR can view any major in their semester
// ============================================================
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
    const semester = searchParams.get("semester");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!semester) {
      return NextResponse.json(
        { success: false, message: "Semester is required" },
        { status: 400 }
      );
    }

    // CR can only view their own semester
    if (semester !== currentUser.semester) {
      return NextResponse.json(
        { success: false, message: "You can only view your own semester" },
        { status: 403 }
      );
    }

    // ✅ ========== 7th / 8th semester: session-based ==========
    if (SENIOR_SEMESTERS.includes(semester)) {
      // ✅ No forced fallback — if no major is provided, return ALL majors
      const majorFilter = searchParams.get("major");

      const sessionQuery = { semester };
      if (majorFilter) sessionQuery.major = majorFilter;
      if (startDate && endDate) {
        sessionQuery.date = { $gte: startDate, $lte: endDate };
      }

      const sessions = await ClassSession.find(sessionQuery)
        .populate("inputBy", "name")
        .sort({ date: 1 });

      const sessionIds = sessions.map((s) => s._id);

      const records = await Attendance.find({
        sessionId: { $in: sessionIds },
      })
        .populate("studentId", "name collegeId email")
        .populate("inputBy", "name")
        .sort({ date: 1, createdAt: 1 });

      // Group by date (a single date may have multiple sessions for different majors)
      const groupedByDate = {};
      records.forEach((r) => {
        if (!groupedByDate[r.date]) groupedByDate[r.date] = [];
        groupedByDate[r.date].push(r);
      });

      const dates = Object.keys(groupedByDate).sort();

      return NextResponse.json({
        success: true,
        mode: "session",
        major: majorFilter || null, // null = all majors
        data: groupedByDate,
        dates,
        totalDates: dates.length,
        sessions,
        totalSessions: sessions.length,
      });
    }
    // ✅ ========== end 7th/8th branch ==========

    // ========== 1st–6th semester: legacy ==========
    const query = { semester };
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate("studentId", "name collegeId email")
      .populate("inputBy", "name")
      .sort({ date: 1, createdAt: 1 });

    const groupedByDate = attendance.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {});

    const dates = Object.keys(groupedByDate).sort();

    return NextResponse.json({
      success: true,
      mode: "legacy",
      data: groupedByDate,
      dates,
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

// ============================================================
// POST — mark attendance
//   • 1st–6th   → find-or-create implicit session, then insert
//   • 7th/8th   → requires sessionId (any major in same semester)
// ============================================================
export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || "unknown",
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Unauthorized Attendance Marking Attempt",
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { date, semester, studentIds, sessionId, major: bodyMajor } = body;

    if (!date || !semester || !studentIds || studentIds.length === 0) {
      const missingFields = [];
      if (!date) missingFields.push("date");
      if (!semester) missingFields.push("semester");
      if (!studentIds || studentIds.length === 0)
        missingFields.push("studentIds");

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
          },
          missingFields,
          providedData: {
            date: date || "missing",
            semester: semester || "missing",
            studentCount: studentIds?.length || 0,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        {
          success: false,
          message: "Date, semester, and student IDs are required",
        },
        { status: 400 }
      );
    }

    // CR can only mark attendance for their own semester
    if (semester !== currentUser.semester) {
      return NextResponse.json(
        { success: false, message: "You can only mark attendance for your own semester" },
        { status: 403 }
      );
    }

    // ✅ ========== 7th / 8th semester: session-based ==========
    if (SENIOR_SEMESTERS.includes(semester)) {
      if (!sessionId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "sessionId is required for 7th/8th semester. Create a class session first.",
          },
          { status: 400 }
        );
      }

      const session = await ClassSession.findById(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, message: "Class session not found" },
          { status: 404 }
        );
      }
      if (session.semester !== semester) {
        return NextResponse.json(
          { success: false, message: "Session semester mismatch" },
          { status: 400 }
        );
      }
      if (session.date !== date) {
        return NextResponse.json(
          { success: false, message: "Session date mismatch" },
          { status: 400 }
        );
      }
      if (session.status === "cancelled") {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot mark attendance for a cancelled session",
          },
          { status: 400 }
        );
      }

      // ✅ Use the session's major — CR can mark any major in their semester.
      // (No comparison to currentUser.major required.)
      const sessionMajor = session.major;
      const majorFilter = bodyMajor || sessionMajor;

      if (majorFilter !== sessionMajor) {
        return NextResponse.json(
          {
            success: false,
            message: `This session is for ${sessionMajor}, not ${majorFilter}`,
          },
          { status: 400 }
        );
      }

      // Every selected student must belong to this semester + major
      const validStudents = await User.find({
        _id: { $in: studentIds },
        semester,
        major: sessionMajor,
        role: { $in: ["student", "cr"] },
      }).select("_id name collegeId email role");

      const validIds = new Set(validStudents.map((s) => s._id.toString()));
      const invalidIds = studentIds.filter((id) => !validIds.has(id));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `${invalidIds.length} student(s) do not belong to ${semester} ${sessionMajor}. Attendance not saved.`,
            invalidIds,
          },
          { status: 400 }
        );
      }

      const existing = await Attendance.find({
        sessionId: session._id,
        studentId: { $in: studentIds },
      }).select("studentId");

      const alreadyIds = new Set(existing.map((e) => e.studentId.toString()));
      const newIds = studentIds.filter((id) => !alreadyIds.has(id));

      if (newIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Attendance already marked for all selected students",
          addedCount: 0,
          alreadyExists: alreadyIds.size,
        });
      }

      const records = newIds.map((studentId) => ({
        date,
        studentId,
        semester,
        major: sessionMajor,
        sessionId: session._id,
        inputBy: currentUser._id,
      }));

      const result = await Attendance.insertMany(records);

      if (
        session.note &&
        /no (students?|one) (came|attended)/i.test(session.note)
      ) {
        session.note = undefined;
        await session.save();
      }

      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Senior Semester Attendance Marked (Session)",
          session: {
            id: session._id,
            date,
            semester,
            major: sessionMajor,
          },
          addedCount: result.length,
          alreadyExisting: alreadyIds.size,
          studentsAdded: validStudents
            .filter((s) => newIds.includes(s._id.toString()))
            .map((s) => ({
              id: s._id,
              name: s.name,
              collegeId: s.collegeId,
              email: s.email,
              role: s.role,
            })),
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json({
        success: true,
        message: `Attendance added for ${result.length} student(s)`,
        addedCount: result.length,
        alreadyExists: alreadyIds.size,
      });
    }
    // ✅ ========== end 7th/8th branch ==========

    // ========== 1st–6th semester: legacy + auto-session ==========
    const students = await User.find({
      _id: { $in: studentIds },
      role: { $in: ["student", "cr"] },
    }).select("name collegeId email role");

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
          email: currentUser.email,
          semester: currentUser.semester,
        },
        attendanceDetails: {
          date,
          semester,
          totalStudentsAttempted: studentIds.length,
          studentsList: students.map((s) => ({
            id: s._id,
            name: s.name,
            collegeId: s.collegeId,
            email: s.email,
            role: s.role,
          })),
        },
        timestamp: new Date().toISOString(),
      }),
    });

    let implicitSession = await ClassSession.findOne({
      date,
      semester,
      major: null,
    });
    if (!implicitSession) {
      try {
        implicitSession = await ClassSession.create({
          date,
          semester,
          major: null,
          inputBy: currentUser._id,
          status: "held",
          isAutoGenerated: true,
        });
      } catch (err) {
        if (err.code === 11000) {
          implicitSession = await ClassSession.findOne({
            date,
            semester,
            major: null,
          });
        } else {
          throw err;
        }
      }
    }

    const existingAttendance = await Attendance.find({
      date,
      semester,
      studentId: { $in: studentIds },
    }).populate("studentId", "name collegeId email");

    const existingStudentIds = new Set(
      existingAttendance.map((a) => a.studentId._id.toString())
    );
    const existingStudentsDetails = existingAttendance.map((a) => ({
      id: a.studentId._id,
      name: a.studentId.name,
      collegeId: a.studentId.collegeId,
      email: a.studentId.email,
      attendanceId: a._id,
    }));

    const newStudentIdsList = studentIds.filter(
      (id) => !existingStudentIds.has(id)
    );

    if (newStudentIdsList.length === 0) {
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
            collegeId: currentUser.collegeId,
          },
          attendanceDetails: {
            date,
            semester,
            totalAttempted: studentIds.length,
            alreadyMarked: existingStudentIds.size,
            existingStudents: existingStudentsDetails,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json({
        success: true,
        message: "Attendance already marked for all selected students",
        addedCount: 0,
        alreadyExists: existingStudentIds.size,
      });
    }

    const attendanceRecords = newStudentIdsList.map((studentId) => ({
      date,
      studentId,
      semester,
      major: null,
      sessionId: implicitSession._id,
      inputBy: currentUser._id,
    }));

    const result = await Attendance.insertMany(attendanceRecords);

    const newlyAddedStudents = await User.find({
      _id: { $in: newStudentIdsList },
    }).select("name collegeId email role");

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
          email: currentUser.email,
          semester: currentUser.semester,
        },
        attendanceDetails: {
          date,
          semester,
          sessionId: implicitSession._id,
          totalAttempted: studentIds.length,
          successfullyAdded: result.length,
          alreadyPresent: existingStudentIds.size,
          attendanceRecords: result.map((record) => ({
            attendanceId: record._id,
            studentId: record.studentId,
            createdAt: record.createdAt,
          })),
        },
        studentsAdded: newlyAddedStudents.map((s) => ({
          id: s._id,
          name: s.name,
          collegeId: s.collegeId,
          email: s.email,
          role: s.role,
        })),
        existingStudents: existingStudentsDetails,
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Attendance added for ${result.length} student(s)`,
      addedCount: result.length,
      alreadyExists: existingStudentIds.size,
    });
  } catch (error) {
    console.error("Error adding attendance:", error);

    try {
      await Log.create({
        user: null,
        userRole: "unknown",
        action: "ATTENDANCE_MARK",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Attendance Marking Failed - System Error",
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (logError) {
      console.error("Failed to create error log:", logError);
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — remove an individual attendance record
// ============================================================
export async function DELETE(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || "unknown",
        action: "ATTENDANCE_DELETE",
        resourceType: "attendance",
        details: JSON.stringify({
          action: "Unauthorized Attendance Deletion Attempt",
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          timestamp: new Date().toISOString(),
        }),
      });

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

    const attendance = await Attendance.findById(attendanceId)
      .populate("studentId", "name collegeId email role")
      .populate("inputBy", "name collegeId");

    if (!attendance) {
      return NextResponse.json(
        { success: false, message: "Attendance record not found" },
        { status: 404 }
      );
    }

    // CR can only delete attendance in their own semester
    if (attendance.semester !== currentUser.semester) {
      return NextResponse.json(
        { success: false, message: "You can only delete attendance in your own semester" },
        { status: 403 }
      );
    }

    await Attendance.findByIdAndDelete(attendanceId);

    if (attendance.sessionId) {
      const remaining = await Attendance.countDocuments({
        sessionId: attendance.sessionId,
      });
      if (remaining === 0) {
        const sess = await ClassSession.findById(attendance.sessionId);
        if (sess && sess.isAutoGenerated) {
          await ClassSession.findByIdAndDelete(attendance.sessionId);
        }
      }
    }

    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ATTENDANCE_DELETE",
      resourceType: "attendance",
      resourceId: attendanceId,
      details: JSON.stringify({
        action: "Attendance Deleted Successfully",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email,
        },
        deletedRecord: {
          id: attendance._id,
          date: attendance.date,
          semester: attendance.semester,
          major: attendance.major || null,
          sessionId: attendance.sessionId || null,
          student: {
            id: attendance.studentId?._id,
            name: attendance.studentId?.name,
            collegeId: attendance.studentId?.collegeId,
            email: attendance.studentId?.email,
            role: attendance.studentId?.role,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    });

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