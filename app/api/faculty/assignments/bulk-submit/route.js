// app/api/faculty/assignments/bulk-submit/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import AssignmentSubmission from "@/app/models/AssignmentSubmission";
import Assignment from "@/app/models/Assignment";
import User from "@/app/models/User";
import Log from "@/app/models/Log";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "faculty" && currentUser.role !== "admin")) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        details: JSON.stringify({
          action: "Unauthorized Bulk Submission Attempt",
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

    const { assignmentId, studentIds, submissionDate } = await request.json();

    if (!assignmentId || !studentIds || studentIds.length === 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        details: JSON.stringify({
          action: "Bulk Submission Failed - Missing Required Fields",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          missingFields: {
            assignmentId: !assignmentId,
            studentIds: !studentIds || studentIds.length === 0
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Assignment ID and student IDs are required" },
        { status: 400 }
      );
    }

    // Get assignment details
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        details: JSON.stringify({
          action: "Bulk Submission Failed - Assignment Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          assignmentId: assignmentId,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    // Get student details for logging
    const students = await User.find({ 
      _id: { $in: studentIds }
    }).select('name collegeId email role semester');

    const dueDate = new Date(assignment.submissionDate);
    const submittedDate = submissionDate ? new Date(submissionDate) : new Date();
    
    // Determine if submission is on time or late
    const status = submittedDate <= dueDate ? "onTime" : "late";

    // Log bulk submission attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_BULK_SUBMIT",
      resourceType: "submission",
      resourceId: assignmentId,
      details: JSON.stringify({
        action: "Bulk Submission Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        assignment: {
          id: assignment._id,
          title: assignment.title,
          course: assignment.courseName,
          dueDate: assignment.submissionDate,
          semester: assignment.semester
        },
        submissionDetails: {
          submittedDate: submittedDate.toISOString(),
          status: status,
          totalStudents: studentIds.length
        },
        studentsList: students.map(s => ({
          id: s._id,
          name: s.name,
          collegeId: s.collegeId,
          email: s.email,
          role: s.role,
          semester: s.semester
        })),
        timestamp: new Date().toISOString()
      })
    });

    // Check for existing submissions
    const existingSubmissions = await AssignmentSubmission.find({
      assignment: assignmentId,
      student: { $in: studentIds }
    }).populate('student', 'name collegeId email');

    const existingStudentIds = new Set(existingSubmissions.map(s => s.student._id.toString()));
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id));
    const duplicateStudentIds = studentIds.filter(id => existingStudentIds.has(id));

    // Get details of duplicate submissions
    const duplicateSubmissionsDetails = existingSubmissions.map(sub => ({
      studentId: sub.student._id,
      studentName: sub.student.name,
      studentCollegeId: sub.student.collegeId,
      previousSubmissionDate: sub.submittedAt,
      previousStatus: sub.status
    }));

    // Prepare bulk operations for new students only
    const bulkOps = newStudentIds.map((studentId) => ({
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

    let result = { modifiedCount: 0, upsertedCount: 0 };
    let successfullySubmittedStudents = [];
    let failedSubmissions = [];

    if (bulkOps.length > 0) {
      result = await AssignmentSubmission.bulkWrite(bulkOps);
      
      // Get details of successfully submitted students
      const successfullySubmittedIds = newStudentIds;
      const successStudents = students.filter(s => successfullySubmittedIds.includes(s._id.toString()));
      
      successfullySubmittedStudents = successStudents.map(s => ({
        id: s._id,
        name: s.name,
        collegeId: s.collegeId,
        email: s.email,
        submittedAt: submittedDate.toISOString(),
        status: status
      }));
    }

    // Handle duplicate submissions (students already submitted)
    if (duplicateStudentIds.length > 0) {
      const duplicateStudents = students.filter(s => duplicateStudentIds.includes(s._id.toString()));
      failedSubmissions = duplicateStudents.map(s => ({
        id: s._id,
        name: s.name,
        collegeId: s.collegeId,
        email: s.email,
        reason: "Already submitted",
        existingSubmission: duplicateSubmissionsDetails.find(d => d.studentId.toString() === s._id.toString())
      }));
    }

    // Update totalSubmissions count in assignment
    const totalSubmissions = await AssignmentSubmission.countDocuments({
      assignment: assignmentId,
    });
    await Assignment.findByIdAndUpdate(assignmentId, { totalSubmissions });

    // Log successful bulk submission with detailed student info
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_BULK_SUBMIT",
      resourceType: "submission",
      resourceId: assignmentId,
      details: JSON.stringify({
        action: "Bulk Submission Completed Successfully",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        assignment: {
          id: assignment._id,
          title: assignment.title,
          course: assignment.courseName,
          courseCode: assignment.courseCode,
          dueDate: assignment.submissionDate,
          semester: assignment.semester
        },
        submissionSummary: {
          submittedDate: submittedDate.toISOString(),
          status: status,
          totalAttempted: studentIds.length,
          successfullySubmitted: newStudentIds.length,
          alreadySubmitted: duplicateStudentIds.length,
          updatedTotalSubmissions: totalSubmissions
        },
        successfullySubmittedStudents: successfullySubmittedStudents,
        alreadySubmittedStudents: failedSubmissions,
        bulkWriteResult: {
          modifiedCount: result.modifiedCount,
          upsertedCount: result.upsertedCount
        },
        timestamp: new Date().toISOString()
      })
    });

    // If there were duplicate submissions, log them separately for tracking
    if (duplicateStudentIds.length > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        resourceId: assignmentId,
        details: JSON.stringify({
          action: "Duplicate Submission Attempts",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          assignment: {
            id: assignment._id,
            title: assignment.title
          },
          duplicateCount: duplicateStudentIds.length,
          duplicateDetails: duplicateSubmissionsDetails,
          timestamp: new Date().toISOString()
        })
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully submitted for ${newStudentIds.length} student(s)${duplicateStudentIds.length > 0 ? ` (${duplicateStudentIds.length} already submitted)` : ''}`,
      submittedCount: newStudentIds.length,
      alreadySubmittedCount: duplicateStudentIds.length,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });
  } catch (error) {
    console.error("Error in bulk submission:", error);
    
    // Log error with details
    try {
      const { assignmentId, studentIds, submissionDate } = await request.json().catch(() => ({}));
      const assignment = assignmentId ? await Assignment.findById(assignmentId).catch(() => null) : null;
      const students = studentIds ? await User.find({ _id: { $in: studentIds } }).select('name collegeId email').catch(() => []) : [];
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        resourceId: assignmentId,
        details: JSON.stringify({
          action: "Bulk Submission Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          assignment: assignment ? {
            id: assignment._id,
            title: assignment.title
          } : { id: assignmentId, title: 'Unknown' },
          attemptedSubmissions: {
            submissionDate: submissionDate,
            studentCount: studentIds?.length || 0,
            studentsList: students.map(s => ({
              id: s._id,
              name: s.name,
              collegeId: s.collegeId
            }))
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