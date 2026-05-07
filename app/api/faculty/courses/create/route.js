// app/api/faculty/courses/create/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { courseName, courseCode, semester, teacherName } = await request.json();
    
    if (!courseName || !semester || !teacherName) {
      return NextResponse.json(
        { success: false, message: 'Course name, semester and teacher name are required' },
        { status: 400 }
      );
    }
    
    const validSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    if (!validSemesters.includes(semester)) {
      return NextResponse.json(
        { success: false, message: 'Invalid semester' },
        { status: 400 }
      );
    }
    
    const course = await Course.create({
      courseName,
      courseCode: courseCode || null,
      semester,
      teacherName,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Course created successfully',
      data: course
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}