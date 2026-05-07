// app/api/faculty/assignments/create/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const body = await request.json();
    const { title, description, chapter, semester, course, teacher, pdfUrl, pdfPublicId, pdfFileName, pdfFileSize, submissionDate, dueDate, instructions } = body;
    
    const courseData = await Course.findById(course);
    if (!courseData) {
      return NextResponse.json({ success: false, message: 'Course not found' }, { status: 404 });
    }
    
    const assignment = await Assignment.create({
      title, description, chapter, semester,
      course,
      courseName: courseData.courseName,
      courseCode: courseData.courseCode,
      teacher,
      teacherName: currentUser.name,
      pdfUrl, pdfPublicId, pdfFileName, pdfFileSize,
      submissionDate, dueDate, instructions
    });
    
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}