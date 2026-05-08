// app/api/student/assignments/submissions/route.js

import { connectToDatabase } from '@/app/lib/mongodb';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    
    if (!assignmentId) {
      return NextResponse.json({ success: false, message: 'Assignment ID required' }, { status: 400 });
    }
    
    const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
      .populate('student', 'name collegeId email')
      .sort({ submittedAt: -1 });
    
    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}