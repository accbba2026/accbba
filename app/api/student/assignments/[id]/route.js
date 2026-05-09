import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import Course from '@/app/models/Course';
import User from '@/app/models/User';  // ✅ Add this import - required for teacher population
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { id } = await params;
    
    const assignment = await Assignment.findById(id)
      .populate('course', 'courseName courseCode')
      .populate('teacher', 'name email');  // Now this will work because User model is registered
    
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Check if student has access to this assignment (same semester)
    if (assignment.semester !== currentUser.semester) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }
    
    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}