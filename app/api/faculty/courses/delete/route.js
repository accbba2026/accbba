// app/api/faculty/courses/delete/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import Assignment from '@/app/models/Assignment';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "COURSE_DELETE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Unauthorized Course Deletion Attempt",
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
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { id } = await request.json();
    
    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "COURSE_DELETE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Course Deletion Failed - Missing ID",
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
        { success: false, message: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    // Get course details before deletion for logging
    const courseToDelete = await Course.findById(id);
    
    if (!courseToDelete) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "COURSE_DELETE",
        resourceType: "course",
        resourceId: id,
        details: JSON.stringify({
          action: "Course Deletion Failed - Course Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          courseId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Check for associated assignments before deletion
    const associatedAssignments = await Assignment.find({ 
      course: id,
      semester: courseToDelete.semester
    }).select('title description submissionDate totalSubmissions');
    
    const assignmentCount = associatedAssignments.length;
    const assignmentDetails = associatedAssignments.map(assignment => ({
      id: assignment._id,
      title: assignment.title,
      submissionDate: assignment.submissionDate,
      totalSubmissions: assignment.totalSubmissions || 0
    }));
    
    // Log deletion attempt with course and assignment details
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "COURSE_DELETE",
      resourceType: "course",
      resourceId: id,
      details: JSON.stringify({
        action: "Course Deletion Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        course: {
          id: courseToDelete._id,
          name: courseToDelete.courseName,
          code: courseToDelete.courseCode,
          semester: courseToDelete.semester,
          teacherName: courseToDelete.teacherName,
          createdAt: courseToDelete.createdAt
        },
        associatedAssignments: {
          count: assignmentCount,
          assignments: assignmentDetails
        },
        timestamp: new Date().toISOString()
      })
    });
    
    // Delete the course
    const deletedCourse = await Course.findByIdAndDelete(id);
    
    // If there are associated assignments, log warning
    if (assignmentCount > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "COURSE_DELETE",
        resourceType: "course",
        resourceId: id,
        details: JSON.stringify({
          action: "Warning - Course Deleted with Associated Assignments",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          course: {
            id: deletedCourse._id,
            name: deletedCourse.courseName,
            code: deletedCourse.courseCode,
            semester: deletedCourse.semester
          },
          orphanedAssignments: {
            count: assignmentCount,
            assignments: assignmentDetails
          },
          timestamp: new Date().toISOString()
        })
      });
    }
    
    // Log successful deletion
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "COURSE_DELETE",
      resourceType: "course",
      resourceId: id,
      details: JSON.stringify({
        action: "Course Deleted Successfully",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        deletedCourse: {
          id: deletedCourse._id,
          name: deletedCourse.courseName,
          code: deletedCourse.courseCode,
          semester: deletedCourse.semester,
          teacherName: deletedCourse.teacherName,
          description: deletedCourse.description,
          createdAt: deletedCourse.createdAt,
          deletedAt: new Date().toISOString()
        },
        associatedAssignmentsAffected: {
          count: assignmentCount,
          wereDeleted: false,
          note: "Assignments still exist in database but are now orphaned (course reference removed)"
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
      warnings: assignmentCount > 0 ? `${assignmentCount} assignment(s) associated with this course still exist.` : undefined
    });
    
  } catch (error) {
    console.error('Error deleting course:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const course = id ? await Course.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "COURSE_DELETE",
        resourceType: "course",
        resourceId: id,
        details: JSON.stringify({
          action: "Course Deletion Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          course: course ? {
            id: course._id,
            name: course.courseName,
            code: course.courseCode
          } : { id: id, name: 'Unknown' },
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
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}