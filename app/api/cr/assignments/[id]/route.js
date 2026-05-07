import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'cr') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    // ✅ Fix: await params before accessing its properties
    const { id } = await params;
    
    const assignment = await Assignment.findById(id)
      .populate('course', 'courseName courseCode');
    
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Check if user has access to this assignment (same semester)
    if (assignment.semester !== currentUser.semester) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }
    
    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}