// app/api/user/get-faculty/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectToDatabase();
    
    const faculty = await User.find({ role: 'faculty' })
      .select('-password -__v')
      .sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      data: faculty,
      count: faculty.length
    });
    
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}