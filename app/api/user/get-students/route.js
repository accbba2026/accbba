// app/api/user/get-students/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query = {
      // Only get users who have a collegeId (students and CRs)
      collegeId: { $exists: true, $ne: null, $ne: "" }
    };
    
    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { collegeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const students = await User.find(query).sort({ semester: 1, name: 1 });
    
    return NextResponse.json({
      success: true,
      data: students,
      count: students.length
    });
    
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}