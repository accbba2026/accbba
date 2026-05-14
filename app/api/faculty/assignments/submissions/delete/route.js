// app/api/faculty/assignments/submissions/delete/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import Assignment from '@/app/models/Assignment';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    // Only faculty or admin can delete submissions
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized. Only faculty and admin can delete submissions.' 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');
    
    if (!submissionId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Submission ID is required' 
      }, { status: 400 });
    }
    
    // Find the submission
    const submission = await AssignmentSubmission.findById(submissionId);
    
    if (!submission) {
      return NextResponse.json({ 
        success: false, 
        message: 'Submission not found' 
      }, { status: 404 });
    }
    
    // Optional: Additional authorization check (can delete any submission)
    // Faculty and admin can delete any submission regardless of assignment ownership
    
    // Delete the submission
    await AssignmentSubmission.findByIdAndDelete(submissionId);
    
    // Update the assignment's totalSubmissions count
    await Assignment.findByIdAndUpdate(
      submission.assignment,
      { $inc: { totalSubmissions: -1 } }
    );
    
    return NextResponse.json({ 
      success: true, 
      message: 'Submission deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}