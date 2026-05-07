// app/api/faculty/courses/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET() {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const courses = await Course.find().sort({ semester: 1, courseName: 1 });
    
    return NextResponse.json({
      success: true,
      data: courses,
      count: courses.length
    });
    
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}