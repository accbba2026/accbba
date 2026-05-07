// app/api/faculty/courses/delete/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const deletedCourse = await Course.findByIdAndDelete(id);
    
    if (!deletedCourse) {
      return NextResponse.json(
        { success: false, message: 'Course not found' },
        { status: 404 }
      );
    }
    
    // Note: In future, you may want to also delete associated assignments here
    
    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}