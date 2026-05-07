// app/api/faculty/assignments/delete/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';
import cloudinary from '@/app/lib/cloudinary';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { id } = await request.json();
    
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Delete PDF from Cloudinary
    if (assignment.pdfPublicId) {
      await cloudinary.uploader.destroy(assignment.pdfPublicId);
    }
    
    // Delete all submissions
    await AssignmentSubmission.deleteMany({ assignment: id });
    await Assignment.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
