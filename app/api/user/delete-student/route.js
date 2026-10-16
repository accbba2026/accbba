// app/api/user/delete-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

const ALLOWED_DELETER_ROLES = ['admin', 'faculty'];
const DELETABLE_ROLES = ['student', 'cr']; // never delete faculty/admin

export async function DELETE(request) {
  try {
    await connectToDatabase();

    // ✅ getCurrentUser reads the cookie and returns the full user (or null)
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // ✅ Only admin or faculty can delete students
    if (!ALLOWED_DELETER_ROLES.includes(currentUser.role)) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: 'USER_DELETE',
        resourceType: 'user',
        details: JSON.stringify({
          action: 'Unauthorized Student Delete Attempt',
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { success: false, message: 'Unauthorized. Faculty or Admin access required.' },
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

    const studentToDelete = await User.findById(id);

    if (!studentToDelete) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // ✅ Never allow deleting faculty, admin, or other privileged accounts
    if (!DELETABLE_ROLES.includes(studentToDelete.role)) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: 'USER_DELETE',
        resourceType: 'user',
        resourceId: id,
        details: JSON.stringify({
          action: 'Blocked Deletion of Non-Student Account',
          attemptedBy: {
            id: currentUser._id,
            name: currentUser.name,
            role: currentUser.role,
          },
          target: {
            id: studentToDelete._id,
            name: studentToDelete.name,
            role: studentToDelete.role,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { success: false, message: 'Only student or CR accounts can be deleted.' },
        { status: 403 }
      );
    }

    // Log successful deletion BEFORE deleting
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: 'USER_DELETE',
      resourceType: 'user',
      resourceId: id,
      details: JSON.stringify({
        action: 'Student Deleted',
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          role: currentUser.role,
        },
        deletedStudent: {
          id: studentToDelete._id,
          name: studentToDelete.name,
          collegeId: studentToDelete.collegeId,
          role: studentToDelete.role,
          semester: studentToDelete.semester,
          session: studentToDelete.session,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}