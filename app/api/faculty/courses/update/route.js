// app/api/faculty/courses/update/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { id, courseName, courseCode, semester, teacherName } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const validSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    if (semester && !validSemesters.includes(semester)) {
      return NextResponse.json(
        { success: false, message: 'Invalid semester' },
        { status: 400 }
      );
    }
    
    const updateData = {};
    if (courseName) updateData.courseName = courseName;
    if (courseCode !== undefined) updateData.courseCode = courseCode || null;
    if (semester) updateData.semester = semester;
    if (teacherName) updateData.teacherName = teacherName;
    
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedCourse) {
      return NextResponse.json(
        { success: false, message: 'Course not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
    
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}