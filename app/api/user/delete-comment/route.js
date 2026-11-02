// app/api/user/delete-comment/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser();

    if (
      !currentUser ||
      (currentUser.role !== 'admin' && currentUser.role !== 'faculty')
    ) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin or Faculty access required.' },
        { status: 403 }
      );
    }

    const { studentId, commentId } = await request.json();

    if (!studentId || !commentId) {
      return NextResponse.json(
        { success: false, message: 'Student ID and Comment ID are required' },
        { status: 400 }
      );
    }

    const student = await User.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    const existing = student.comments.id(commentId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      );
    }

    const removedSnapshot = {
      _id: existing._id,
      text: existing.text,
      authorName: existing.authorName,
      authorRole: existing.authorRole,
      date: existing.date,
    };

    student.comments.pull(commentId);
    await student.save();

    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: 'USER_UPDATE',
      resourceType: 'user',
      resourceId: studentId,
      details: JSON.stringify({
        action: 'Comment Deleted from Student',
        studentId,
        deletedComment: removedSnapshot,
        deletedBy: {
          id: currentUser._id,
          name: currentUser.name,
          role: currentUser.role,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}