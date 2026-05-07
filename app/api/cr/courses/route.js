// app/api/cr/courses/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'cr') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') || currentUser.semester;
    
    const courses = await Course.find({ semester }).sort({ courseName: 1 });
    
    return NextResponse.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching CR courses:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}