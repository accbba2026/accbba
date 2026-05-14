// app/api/cr/assignments/bulk-submit/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'cr') {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        details: `Unauthorized bulk submission attempt by user with role: ${currentUser?.role || 'unknown'}`
      });
      
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { assignmentId, studentIds, submissionDate } = await request.json();
    
    if (!assignmentId) {
      return NextResponse.json({ success: false, message: 'Assignment ID is required' }, { status: 400 });
    }
    
    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one student' }, { status: 400 });
    }
    
    if (!submissionDate) {
      return NextResponse.json({ success: false, message: 'Submission date is required' }, { status: 400 });
    }
    
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      // Log assignment not found
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        details: `Bulk submission failed: Assignment not found with ID: ${assignmentId}`
      });
      
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Verify assignment belongs to CR's semester
    if (assignment.semester !== currentUser.semester) {
      // Log semester mismatch
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        resourceId: assignmentId,
        details: `Bulk submission failed: Semester mismatch. CR: ${currentUser.name} (${currentUser.collegeId}) - Semester: ${currentUser.semester}, Assignment: "${assignment.title}" - Semester: ${assignment.semester}`
      });
      
      return NextResponse.json({ 
        success: false, 
        message: 'You can only submit for assignments from your semester' 
      }, { status: 403 });
    }
    
    // Get student details - include both students and CR
    const students = await User.find({ 
      _id: { $in: studentIds },
      $or: [
        { role: 'student' },
        { role: 'cr' },
        { role: 'cr', _id: currentUser._id }
      ],
      semester: currentUser.semester
    });
    
    if (students.length === 0) {
      // Log no valid students found
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        resourceId: assignmentId,
        details: `Bulk submission failed: No valid students found for semester ${currentUser.semester}. Student IDs provided: ${studentIds.join(', ')}`
      });
      
      return NextResponse.json({ success: false, message: 'No valid students found' }, { status: 404 });
    }
    
    const submissionDateTime = new Date(submissionDate);
    const isLate = assignment.dueDate && submissionDateTime > new Date(assignment.dueDate);
    
    let submittedCount = 0;
    const errors = [];
    const submittedStudents = [];
    const failedStudents = [];
    
    for (const student of students) {
      try {
        // Check if already submitted
        const existingSubmission = await AssignmentSubmission.findOne({
          assignment: assignmentId,
          student: student._id
        });
        
        if (existingSubmission) {
          const errorMsg = `${student.name} (${student.collegeId}) - Already submitted on ${new Date(existingSubmission.submittedAt).toLocaleString()}`;
          errors.push(errorMsg);
          failedStudents.push({
            id: student._id,
            name: student.name,
            collegeId: student.collegeId,
            reason: 'Already submitted',
            previousSubmissionDate: existingSubmission.submittedAt
          });
          continue;
        }
        
        // Create submission with custom submission date
        const submission = await AssignmentSubmission.create({
          assignment: assignmentId,
          student: student._id,
          studentName: student.name,
          studentCollegeId: student.collegeId,
          submittedAt: submissionDateTime,
          status: isLate ? 'late' : 'onTime',
        });
        
        submittedCount++;
        submittedStudents.push({
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          submissionId: submission._id,
          submittedAt: submissionDateTime,
          status: isLate ? 'late' : 'onTime'
        });
      } catch (error) {
        const errorMsg = `${student.name} (${student.collegeId}) - ${error.message}`;
        errors.push(errorMsg);
        failedStudents.push({
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          reason: error.message
        });
      }
    }
    
    // Update assignment submission count
    await Assignment.findByIdAndUpdate(assignmentId, {
      $inc: { totalSubmissions: submittedCount }
    });
    
    // Get the updated assignment with new submission count
    const updatedAssignment = await Assignment.findById(assignmentId);
    
    // Log successful bulk submission with complete details
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_BULK_SUBMIT",
      resourceType: "submission",
      resourceId: assignmentId,
      details: JSON.stringify({
        action: "Bulk Assignment Submission",
        submittedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          semester: currentUser.semester
        },
        assignment: {
          id: assignment._id,
          title: assignment.title,
          description: assignment.description,
          course: assignment.courseName,
          courseCode: assignment.courseCode,
          semester: assignment.semester,
          dueDate: assignment.dueDate,
          submissionDeadline: assignment.submissionDate
        },
        submissionDetails: {
          submissionDate: submissionDateTime.toISOString(),
          status: isLate ? 'Late' : 'On Time',
          totalStudentsAttempted: students.length,
          successfullySubmitted: submittedCount,
          failedCount: errors.length,
          updatedTotalSubmissions: updatedAssignment.totalSubmissions || 0
        },
        submittedStudents: submittedStudents.map(s => ({
          name: s.name,
          collegeId: s.collegeId,
          submittedAt: s.submittedAt.toISOString(),
          status: s.status
        })),
        failedStudents: failedStudents.map(f => ({
          name: f.name,
          collegeId: f.collegeId,
          reason: f.reason,
          previousSubmissionDate: f.previousSubmissionDate ? new Date(f.previousSubmissionDate).toISOString() : null
        }))
      })
    });
    
    // If there were errors, create a separate detailed error log
    if (errors.length > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        resourceId: assignmentId,
        details: JSON.stringify({
          action: "Bulk Submission Errors",
          submittedBy: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          assignment: {
            id: assignment._id,
            title: assignment.title,
            course: assignment.courseName
          },
          errors: errors.map(err => ({
            message: err,
            timestamp: new Date().toISOString()
          }))
        })
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully submitted for ${submittedCount} student(s)`,
      submittedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error in bulk submission:', error);
    
    // Log error with available information
    try {
      const { assignmentId, studentIds } = await request.json();
      const assignment = assignmentId ? await Assignment.findById(assignmentId) : null;
      const students = studentIds ? await User.find({ _id: { $in: studentIds } }).select('name collegeId') : [];
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_BULK_SUBMIT",
        resourceType: "submission",
        resourceId: assignmentId,
        details: JSON.stringify({
          action: "Bulk Submission Error",
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          },
          context: {
            submittedBy: currentUser ? {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role
            } : null,
            assignment: assignment ? {
              id: assignment._id,
              title: assignment.title,
              course: assignment.courseName
            } : { id: assignmentId, title: 'Unknown' },
            attemptedStudents: students.map(s => ({
              name: s.name,
              collegeId: s.collegeId
            }))
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to submit assignments' 
    }, { status: 500 });
  }
}