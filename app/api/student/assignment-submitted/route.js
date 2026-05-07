import { connectToDatabase } from '@/app/lib/mongodb';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'student') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    
    if (!assignmentId) {
      return NextResponse.json({ success: false, message: 'Assignment ID required' }, { status: 400 });
    }
    
    // Find submission for this specific assignment and student
    const submission = await AssignmentSubmission.findOne({
      assignment: assignmentId,
      student: currentUser._id
    }).populate('student', 'name collegeId');
    
    return NextResponse.json({ 
      success: true, 
      data: {
        submitted: !!submission,
        submission: submission || null,
        status: submission ? (submission.status === 'onTime' ? 'On Time' : 'Late') : null
      }
    });
  } catch (error) {
    console.error('Error checking submission:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}