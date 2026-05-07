// app/api/faculty/assignments/submissions/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    
    const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
      .populate('student', 'name collegeId email')
      .sort({ submittedAt: -1 });
    
    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}