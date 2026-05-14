// app/api/faculty/assignments/update/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function PUT(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    // Faculty or Admin can update assignments
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'Assignment ID is required' }, { status: 400 });
    }
    
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Optional: Verify faculty can only edit their own assignments
    // Uncomment if you want to restrict faculty to only edit their own assignments
    // if (currentUser.role === 'faculty' && assignment.teacher !== currentUser.id) {
    //   return NextResponse.json({ success: false, message: 'You can only edit your own assignments' }, { status: 403 });
    // }
    
    // If course is being updated, fetch the course details
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
    
    // Remove teacher field if present to prevent unauthorized teacher changes
    if (updateData.teacher) {
      delete updateData.teacher;
    }
    
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({ success: true, data: updatedAssignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}