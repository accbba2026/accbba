// app/api/user/bulk-update-semester/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import Log from "@/app/models/Log";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";
import mongoose from "mongoose";

// Semester progression mapping
const semesterProgression = {
  "1st": "2nd",
  "2nd": "3rd",
  "3rd": "4th",
  "4th": "5th",
  "5th": "6th",
  "6th": "7th",
  "7th": "8th",
  "8th": "graduated",
};

// POST endpoint for bulk semester updates
export async function POST(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    // Only admin can perform bulk semester updates
    if (!currentUser || currentUser.role !== 'admin') {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Unauthorized Bulk Semester Update Attempt",
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
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetSemester, studentIds, increment, semesterFilter } = body;

    console.log("Bulk semester update request:", {
      targetSemester,
      studentIds,
      increment,
      semesterFilter,
    });

    // Case 1: Bulk increment semester for all active students
    if (increment && !targetSemester) {
      // Log attempt
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Bulk Semester Increment Attempt",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
            email: currentUser.email
          },
          operation: "increment_all_active_students",
          timestamp: new Date().toISOString()
        })
      });

      const students = await User.find({
        status: "active",
        semester: { $ne: "graduated" },
        collegeId: { $exists: true, $ne: null, $ne: "" },
        role: { $in: ["student", "cr"] }
      });

      const studentsWithOldSemester = students.map(s => ({
        id: s._id,
        name: s.name,
        collegeId: s.collegeId,
        oldSemester: s.semester,
        newSemester: semesterProgression[s.semester] || null
      }));

      const bulkOps = students
        .map((student) => {
          const nextSemester = semesterProgression[student.semester];
          if (nextSemester) {
            return {
              updateOne: {
                filter: { _id: student._id },
                update: {
                  $set: {
                    semester: nextSemester,
                    status:
                      nextSemester === "graduated" ? "graduated" : "active",
                  },
                },
              },
            };
          }
          return null;
        })
        .filter((op) => op !== null);

      if (bulkOps.length > 0) {
        const result = await User.bulkWrite(bulkOps);
        
        // Get updated students for logging
        const updatedStudentIds = students.filter(s => semesterProgression[s.semester]).map(s => s._id);
        const updatedStudents = await User.find({ _id: { $in: updatedStudentIds } }).select('name collegeId semester');
        
        // Log successful increment
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          details: JSON.stringify({
            action: "Bulk Semester Increment Completed",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role,
              email: currentUser.email
            },
            operation: "increment_all_active_students",
            summary: {
              totalProcessed: students.length,
              successfullyUpdated: result.modifiedCount,
              failedCount: students.length - result.modifiedCount
            },
            studentsUpdated: updatedStudents.map(s => ({
              id: s._id,
              name: s.name,
              collegeId: s.collegeId,
              newSemester: s.semester
            })),
            previousSemesterMapping: studentsWithOldSemester.filter(s => s.newSemester).map(s => ({
              name: s.name,
              collegeId: s.collegeId,
              from: s.oldSemester,
              to: s.newSemester
            })),
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json({
          success: true,
          message: `Successfully updated ${result.modifiedCount} students to next semester`,
          data: { modifiedCount: result.modifiedCount },
        });
      } else {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          details: JSON.stringify({
            action: "Bulk Semester Increment - No Students to Update",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role
            },
            operation: "increment_all_active_students",
            reason: "No active students found or all students are already graduated",
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json({
          success: true,
          message: "No students to update",
          data: { modifiedCount: 0 },
        });
      }
    }

    // Case 2: Set specific semester for selected students
    if (targetSemester && studentIds && studentIds.length > 0) {
      // Validate semester
      const validSemesters = [
        "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "graduated"
      ];
      if (!validSemesters.includes(targetSemester)) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          details: JSON.stringify({
            action: "Bulk Semester Update Failed - Invalid Semester",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role
            },
            attemptedSemester: targetSemester,
            validSemesters: validSemesters,
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json(
          { success: false, message: "Invalid semester selected" },
          { status: 400 }
        );
      }

      // Get student details before update
      const objectIds = studentIds
        .map((id) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (error) {
            return null;
          }
        })
        .filter((id) => id !== null);

      if (objectIds.length === 0) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          details: JSON.stringify({
            action: "Bulk Semester Update Failed - Invalid Student IDs",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role
            },
            providedIds: studentIds,
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json(
          { success: false, message: "Invalid student ID format" },
          { status: 400 }
        );
      }

      // Get students before update
      const studentsBefore = await User.find({ _id: { $in: objectIds } }).select('name collegeId semester role');
      
      // Log attempt
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Bulk Semester Update Attempt (Selected Students)",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
            email: currentUser.email
          },
          operation: "set_specific_semester_for_selected",
          targetSemester: targetSemester,
          studentsToUpdate: studentsBefore.map(s => ({
            id: s._id,
            name: s.name,
            collegeId: s.collegeId,
            currentSemester: s.semester,
            role: s.role
          })),
          timestamp: new Date().toISOString()
        })
      });

      const result = await User.updateMany(
        { _id: { $in: objectIds } },
        { $set: { semester: targetSemester } }
      );

      // Get students after update
      const studentsAfter = await User.find({ _id: { $in: objectIds } }).select('name collegeId semester');

      // Log successful update
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Bulk Semester Update Completed (Selected Students)",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
            email: currentUser.email
          },
          operation: "set_specific_semester_for_selected",
          targetSemester: targetSemester,
          summary: {
            totalAttempted: objectIds.length,
            successfullyUpdated: result.modifiedCount,
            failedCount: objectIds.length - result.modifiedCount
          },
          studentsUpdated: studentsAfter.map(s => ({
            id: s._id,
            name: s.name,
            collegeId: s.collegeId,
            newSemester: s.semester
          })),
          semesterChanges: studentsBefore.map(before => {
            const after = studentsAfter.find(a => a._id.toString() === before._id.toString());
            return {
              name: before.name,
              collegeId: before.collegeId,
              from: before.semester,
              to: after?.semester || targetSemester
            };
          }),
          timestamp: new Date().toISOString()
        })
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${result.modifiedCount} students to ${targetSemester} semester`,
        data: { modifiedCount: result.modifiedCount },
      });
    }

    // Case 3: Update all students in a specific semester
    if (targetSemester && semesterFilter) {
      // Get students before update
      const studentsBefore = await User.find({ 
        semester: semesterFilter, 
        status: "active",
        role: { $in: ["student", "cr"] }
      }).select('name collegeId semester');
      
      // Log attempt
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Bulk Semester Update Attempt (By Semester Filter)",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
            email: currentUser.email
          },
          operation: "update_all_students_in_semester",
          fromSemester: semesterFilter,
          toSemester: targetSemester,
          affectedStudentsCount: studentsBefore.length,
          studentsList: studentsBefore.map(s => ({
            id: s._id,
            name: s.name,
            collegeId: s.collegeId,
            currentSemester: s.semester
          })),
          timestamp: new Date().toISOString()
        })
      });

      const result = await User.updateMany(
        { semester: semesterFilter, status: "active", role: { $in: ["student", "cr"] } },
        { $set: { semester: targetSemester } }
      );

      // Get students after update
      const studentsAfter = await User.find({ 
        semester: targetSemester,
        role: { $in: ["student", "cr"] }
      }).select('name collegeId semester');

      // Log successful update
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Bulk Semester Update Completed (By Semester Filter)",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
            email: currentUser.email
          },
          operation: "update_all_students_in_semester",
          summary: {
            fromSemester: semesterFilter,
            toSemester: targetSemester,
            totalAttempted: studentsBefore.length,
            successfullyUpdated: result.modifiedCount
          },
          studentsUpdated: studentsAfter.map(s => ({
            id: s._id,
            name: s.name,
            collegeId: s.collegeId,
            newSemester: s.semester
          })),
          timestamp: new Date().toISOString()
        })
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${result.modifiedCount} students from ${semesterFilter} to ${targetSemester} semester`,
        data: { modifiedCount: result.modifiedCount },
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid update parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in bulk semester update:", error);
    
    // Log error
    try {
      const body = await request.json().catch(() => ({}));
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Bulk Semester Update Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedOperation: body,
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
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for semester statistics
export async function GET(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    // Only admin can view semester stats
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    console.log("GET request - action:", action);

    if (action === "stats") {
      // Get semester statistics - ONLY for students and CRs
      const semesterStats = await User.aggregate([
        { 
          $match: { 
            role: { $in: ["student", "cr"] },
            status: "active"
          } 
        },
        {
          $group: {
            _id: "$semester",
            count: { $sum: 1 },
            students: { $push: { name: "$name", collegeId: "$collegeId" } }
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Log stats view
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_VIEW",
        resourceType: "user",
        details: JSON.stringify({
          action: "Semester Statistics Viewed",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          timestamp: new Date().toISOString()
        })
      });

      return NextResponse.json({
        success: true,
        data: semesterStats,
      });
    }

    // Get all active students and CRs grouped by semester
    const studentsBySemester = await User.aggregate([
      { $match: { status: "active", role: { $in: ["student", "cr"] } } },
      {
        $group: {
          _id: "$semester",
          students: {
            $push: { 
              id: "$_id", 
              name: "$name", 
              collegeId: "$collegeId",
              role: "$role"
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      data: studentsBySemester,
    });
  } catch (error) {
    console.error("Error fetching semester stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}