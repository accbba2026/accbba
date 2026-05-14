// app/api/user/delete-faculty/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Assignment from '@/app/models/Assignment';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    // Only admin can delete faculty
    if (!currentUser || currentUser.role !== 'admin') {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_DELETE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Unauthorized Faculty Deletion Attempt",
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
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }
    
    const { id } = await request.json();
    
    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_DELETE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Faculty Deletion Failed - Missing ID",
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
        { success: false, message: 'Faculty ID is required' },
        { status: 400 }
      );
    }
    
    // Get faculty details before deletion
    const facultyToDelete = await User.findById(id);
    
    if (!facultyToDelete) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_DELETE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Deletion Failed - Faculty Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          facultyId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    // Verify that the user is actually a faculty member
    if (facultyToDelete.role !== 'faculty') {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_DELETE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Deletion Failed - User is not a Faculty",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          attemptedUser: {
            id: facultyToDelete._id,
            name: facultyToDelete.name,
            collegeId: facultyToDelete.collegeId,
            role: facultyToDelete.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'User is not a faculty member' },
        { status: 400 }
      );
    }
    
    // Check for associated assignments
    const associatedAssignments = await Assignment.find({ 
      teacher: id
    }).select('title description submissionDate semester totalSubmissions');
    
    const assignmentCount = associatedAssignments.length;
    const assignmentDetails = associatedAssignments.map(assignment => ({
      id: assignment._id,
      title: assignment.title,
      semester: assignment.semester,
      submissionDate: assignment.submissionDate,
      totalSubmissions: assignment.totalSubmissions || 0
    }));
    
    // Log deletion attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_DELETE",
      resourceType: "user",
      resourceId: id,
      details: JSON.stringify({
        action: "Faculty Deletion Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        facultyToDelete: {
          id: facultyToDelete._id,
          name: facultyToDelete.name,
          collegeId: facultyToDelete.collegeId,
          email: facultyToDelete.email,
          phone: facultyToDelete.phone,
          role: facultyToDelete.role,
          status: facultyToDelete.status,
          createdAt: facultyToDelete.createdAt
        },
        associatedAssignments: {
          count: assignmentCount,
          assignments: assignmentDetails
        },
        timestamp: new Date().toISOString()
      })
    });
    
    // Delete the faculty member
    const deletedFaculty = await User.findByIdAndDelete(id);
    
    // If there are associated assignments, log warning
    if (assignmentCount > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_DELETE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Warning - Faculty Deleted with Associated Assignments",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          faculty: {
            id: deletedFaculty._id,
            name: deletedFaculty.name,
            collegeId: deletedFaculty.collegeId
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
      action: "USER_DELETE",
      resourceType: "user",
      resourceId: id,
      details: JSON.stringify({
        action: "Faculty Deleted Successfully",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        deletedFaculty: {
          id: deletedFaculty._id,
          name: deletedFaculty.name,
          collegeId: deletedFaculty.collegeId,
          email: deletedFaculty.email,
          phone: deletedFaculty.phone,
          role: deletedFaculty.role,
          status: deletedFaculty.status,
          createdAt: deletedFaculty.createdAt,
          deletedAt: new Date().toISOString()
        },
        associatedAssignmentsAffected: {
          count: assignmentCount,
          wereDeleted: false,
          note: "Assignments still exist in database but are now orphaned (teacher reference removed)"
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({
      success: true,
      message: 'Faculty member deleted successfully',
      warnings: assignmentCount > 0 ? `${assignmentCount} assignment(s) associated with this faculty still exist.` : undefined
    });
    
  } catch (error) {
    console.error('Error deleting faculty:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const faculty = id ? await User.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_DELETE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Deletion Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          faculty: faculty ? {
            id: faculty._id,
            name: faculty.name,
            collegeId: faculty.collegeId,
            role: faculty.role
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