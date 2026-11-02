// app/api/user/add-comment/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
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

    const { studentId, text } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, message: 'Comment text cannot be empty' },
        { status: 400 }
      );
    }

    if (text.trim().length > 1000) {
      return NextResponse.json(
        { success: false, message: 'Comment cannot exceed 1000 characters' },
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

    if (student.role !== 'student' && student.role !== 'cr') {
      return NextResponse.json(
        { success: false, message: 'Comments can only be added to students' },
        { status: 400 }
      );
    }

    const newComment = {
      text: text.trim(),
      authorId: currentUser._id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      date: new Date(),
    };

    student.comments.push(newComment);
    await student.save();

    const savedComment = student.comments[student.comments.length - 1];

    // Audit log
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: 'USER_UPDATE',
      resourceType: 'user',
      resourceId: studentId,
      details: JSON.stringify({
        action: 'Comment Added to Student',
        studentId,
        commentId: savedComment._id,
        text: savedComment.text,
        author: {
          id: currentUser._id,
          name: currentUser.name,
          role: currentUser.role,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: savedComment,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}