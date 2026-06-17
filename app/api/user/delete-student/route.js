// app/api/user/delete-student/route.js

import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    // Only admin can delete students
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Find the student to log their details before deletion
    const studentToDelete = await User.findById(id);
    
    if (!studentToDelete) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Log the successful deletion attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_DELETE",
      resourceType: "user",
      resourceId: id,
      details: JSON.stringify({
        action: "Student Deleted",
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          role: currentUser.role
        },
        deletedStudent: {
          id: studentToDelete._id,
          name: studentToDelete.name,
          collegeId: studentToDelete.collegeId,
          role: studentToDelete.role
        },
        timestamp: new Date().toISOString()
      })
    });

    // Delete the student
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting student:', error);
    
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}