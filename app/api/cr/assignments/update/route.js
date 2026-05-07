import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function PUT(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'cr') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { id, ...updateData } = await request.json();
    
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Verify assignment belongs to CR's semester
    if (assignment.semester !== currentUser.semester) {
      return NextResponse.json({ success: false, message: 'You can only edit assignments from your semester' }, { status: 403 });
    }
    
    if (updateData.course) {
      const courseData = await Course.findById(updateData.course);
      if (courseData) {
        updateData.courseName = courseData.courseName;
        updateData.courseCode = courseData.courseCode;
      }
    }
    
    // Ensure resources is properly handled (prevent undefined)
    if (updateData.resources === undefined) {
      updateData.resources = [];
    }
    
    // If PDF file is not being updated, keep existing PDF data
    // (Don't override with undefined values)
    if (updateData.pdfUrl === undefined) {
      delete updateData.pdfUrl;
      delete updateData.pdfPublicId;
      delete updateData.pdfFileName;
      delete updateData.pdfFileSize;
    }
    
    const updatedAssignment = await Assignment.findByIdAndUpdate(id, updateData, { new: true });
    
    return NextResponse.json({ success: true, data: updatedAssignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}