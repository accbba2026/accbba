// app/api/faculty/assignments/submissions/delete/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import Assignment from '@/app/models/Assignment';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    // Only faculty or admin can delete submissions
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_SUBMISSION_DELETE",
        resourceType: "submission",
        details: JSON.stringify({
          action: "Unauthorized Submission Deletion Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized. Only faculty and admin can delete submissions.' 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');
    
    if (!submissionId) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_SUBMISSION_DELETE",
        resourceType: "submission",
        details: JSON.stringify({
          action: "Submission Deletion Failed - Missing ID",
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
        success: false, 
        message: 'Submission ID is required' 
      }, { status: 400 });
    }
    
    // Find the submission with populated data
    const submission = await AssignmentSubmission.findById(submissionId)
      .populate('student', 'name collegeId email phone role')
      .populate('assignment', 'title description submissionDate dueDate courseName');
    
    if (!submission) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_SUBMISSION_DELETE",
        resourceType: "submission",
        resourceId: submissionId,
        details: JSON.stringify({
          action: "Submission Deletion Failed - Submission Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          submissionId: submissionId,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ 
        success: false, 
        message: 'Submission not found' 
      }, { status: 404 });
    }
    
    // Get assignment details
    const assignment = await Assignment.findById(submission.assignment);
    
    // Log deletion attempt with full details
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_SUBMISSION_DELETE",
      resourceType: "submission",
      resourceId: submissionId,
      details: JSON.stringify({
        action: "Submission Deletion Attempt",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        submission: {
          id: submission._id,
          submittedAt: submission.submittedAt,
          status: submission.status,
          gradedBy: submission.gradedBy
        },
        student: {
          id: submission.student?._id,
          name: submission.student?.name,
          collegeId: submission.student?.collegeId,
          email: submission.student?.email,
          phone: submission.student?.phone,
          role: submission.student?.role
        },
        assignment: {
          id: submission.assignment?._id,
          title: submission.assignment?.title,
          description: submission.assignment?.description,
          courseName: submission.assignment?.courseName,
          submissionDate: submission.assignment?.submissionDate,
          dueDate: submission.assignment?.dueDate,
          totalSubmissionsBefore: assignment?.totalSubmissions || 0
        },
        timestamp: new Date().toISOString()
      })
    });
    
    // Delete the submission
    await AssignmentSubmission.findByIdAndDelete(submissionId);
    
    // Update the assignment's totalSubmissions count
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      submission.assignment,
      { $inc: { totalSubmissions: -1 } },
      { new: true }
    );
    
    // Log successful deletion
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_SUBMISSION_DELETE",
      resourceType: "submission",
      resourceId: submissionId,
      details: JSON.stringify({
        action: "Submission Deleted Successfully",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        deletedSubmission: {
          id: submission._id,
          submittedAt: submission.submittedAt,
          status: submission.status,
          deletedAt: new Date().toISOString()
        },
        student: {
          id: submission.student?._id,
          name: submission.student?.name,
          collegeId: submission.student?.collegeId,
          email: submission.student?.email
        },
        assignment: {
          id: submission.assignment?._id,
          title: submission.assignment?.title,
          courseName: submission.assignment?.courseName,
          submissionDate: submission.assignment?.submissionDate,
          totalSubmissionsBefore: assignment?.totalSubmissions || 0,
          totalSubmissionsAfter: updatedAssignment?.totalSubmissions || 0
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Submission deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    
    // Log error with details (without trying to parse request body again)
    try {
      const { searchParams } = new URL(request.url);
      const submissionId = searchParams.get('id');
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_SUBMISSION_DELETE",
        resourceType: "submission",
        resourceId: submissionId,
        details: JSON.stringify({
          action: "Submission Deletion Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          submissionId: submissionId,
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
    
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}