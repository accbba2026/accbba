// app/api/faculty/assignments/delete/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';
import cloudinary from '@/app/lib/cloudinary';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_DELETE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Unauthorized Assignment Deletion Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { id } = await request.json();
    
    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_DELETE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Deletion Failed - Missing ID",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Assignment ID is required' }, { status: 400 });
    }
    
    // Get assignment details before deletion for logging
    const assignment = await Assignment.findById(id)
      .populate('course', 'courseName courseCode')
      .populate('teacher', 'name email collegeId');
    
    if (!assignment) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_DELETE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Deletion Failed - Assignment Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          assignmentId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Get submission details before deletion
    const submissions = await AssignmentSubmission.find({ assignment: id })
      .populate('student', 'name collegeId email');
    
    const submissionCount = submissions.length;
    const submissionDetails = submissions.map(sub => ({
      id: sub._id,
      studentId: sub.student?._id,
      studentName: sub.student?.name,
      studentCollegeId: sub.student?.collegeId,
      studentEmail: sub.student?.email,
      submittedAt: sub.submittedAt,
      status: sub.status,
      gradedBy: sub.gradedBy
    }));
    
    // Calculate submission statistics
    const onTimeCount = submissions.filter(s => s.status === 'onTime').length;
    const lateCount = submissions.filter(s => s.status === 'late').length;
    
    // Log deletion attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_DELETE",
      resourceType: "assignment",
      resourceId: id,
      details: JSON.stringify({
        action: "Assignment Deletion Attempt",
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
          description: assignment.description,
          chapter: assignment.chapter,
          semester: assignment.semester,
          course: {
            id: assignment.course?._id,
            name: assignment.courseName,
            code: assignment.courseCode
          },
          teacher: {
            id: assignment.teacher,
            name: assignment.teacherName
          },
          submissionDate: assignment.submissionDate,
          dueDate: assignment.dueDate,
          hasPDF: !!assignment.pdfUrl,
          pdfFileName: assignment.pdfFileName,
          totalSubmissions: assignment.totalSubmissions || 0,
          createdAt: assignment.createdAt
        },
        submissionsSummary: {
          totalSubmissions: submissionCount,
          onTimeSubmissions: onTimeCount,
          lateSubmissions: lateCount
        },
        timestamp: new Date().toISOString()
      })
    });
    
    // Delete PDF from Cloudinary
    let pdfDeleted = false;
    if (assignment.pdfPublicId) {
      try {
        const cloudinaryResult = await cloudinary.uploader.destroy(assignment.pdfPublicId);
        pdfDeleted = cloudinaryResult.result === 'ok';
        
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "ASSIGNMENT_DELETE",
          resourceType: "assignment",
          resourceId: id,
          details: JSON.stringify({
            action: "PDF Deletion from Cloudinary",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId
            },
            pdfDetails: {
              publicId: assignment.pdfPublicId,
              fileName: assignment.pdfFileName,
              deleted: pdfDeleted,
              cloudinaryResult: cloudinaryResult
            },
            timestamp: new Date().toISOString()
          })
        });
      } catch (cloudinaryError) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "ASSIGNMENT_DELETE",
          resourceType: "assignment",
          resourceId: id,
          details: JSON.stringify({
            action: "PDF Deletion Failed",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId
            },
            pdfDetails: {
              publicId: assignment.pdfPublicId,
              fileName: assignment.pdfFileName
            },
            error: {
              message: cloudinaryError.message,
              timestamp: new Date().toISOString()
            }
          })
        });
      }
    }
    
    // Delete all submissions
    const submissionDeletionResult = await AssignmentSubmission.deleteMany({ assignment: id });
    
    // Log submission deletions
    if (submissionCount > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_DELETE",
        resourceType: "submission",
        resourceId: id,
        details: JSON.stringify({
          action: "Associated Submissions Deleted",
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
          deletionSummary: {
            totalDeleted: submissionDeletionResult.deletedCount,
            expectedDeletions: submissionCount
          },
          submissionsList: submissionDetails.map(sub => ({
            id: sub.id,
            studentName: sub.studentName,
            studentCollegeId: sub.studentCollegeId,
            submittedAt: sub.submittedAt,
            status: sub.status
          })),
          timestamp: new Date().toISOString()
        })
      });
    }
    
    // Delete the assignment
    await Assignment.findByIdAndDelete(id);
    
    // Log successful assignment deletion
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_DELETE",
      resourceType: "assignment",
      resourceId: id,
      details: JSON.stringify({
        action: "Assignment Deleted Successfully",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        deletedAssignment: {
          id: assignment._id,
          title: assignment.title,
          description: assignment.description,
          chapter: assignment.chapter,
          semester: assignment.semester,
          course: {
            id: assignment.course?._id,
            name: assignment.courseName,
            code: assignment.courseCode
          },
          teacher: {
            id: assignment.teacher,
            name: assignment.teacherName
          },
          submissionDate: assignment.submissionDate,
          dueDate: assignment.dueDate,
          pdfDeleted: pdfDeleted,
          totalSubmissionsDeleted: submissionDeletionResult.deletedCount,
          createdAt: assignment.createdAt,
          deletedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Assignment deleted successfully',
      deletedAssignment: {
        title: assignment.title,
        submissionsDeleted: submissionDeletionResult.deletedCount,
        pdfDeleted: pdfDeleted
      }
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const assignment = id ? await Assignment.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_DELETE",
        resourceType: "assignment",
        resourceId: id,
        details: JSON.stringify({
          action: "Assignment Deletion Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          assignment: assignment ? {
            id: assignment._id,
            title: assignment.title
          } : { id: id, title: 'Unknown' },
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
    
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}