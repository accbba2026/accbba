// app/api/cr/create-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    // Verify CR is authenticated
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'cr') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { name, collegeId, phone, email, semester } = await request.json();
    
    // Validate required fields
    if (!name || !collegeId) {
      return NextResponse.json(
        { success: false, message: 'Name and College ID are required' },
        { status: 400 }
      );
    }
    
    // Validate college ID format
    if (!/^\d{6}$/.test(collegeId)) {
      return NextResponse.json(
        { success: false, message: 'College ID must be 6 digits' },
        { status: 400 }
      );
    }
    
    // Check if student already exists
    const existingStudent = await User.findOne({ collegeId });
    if (existingStudent) {
      return NextResponse.json(
        { success: false, message: 'Student with this College ID already exists' },
        { status: 409 }
      );
    }
    
    // Create new student with CR's semester
    const student = await User.create({
      name,
      collegeId,
      phone: phone || null,
      email: email?.toLowerCase() || null,
      semester: currentUser.semester, // Force CR's semester
      role: 'student',
      status: 'active',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Student added successfully',
      data: {
        id: student._id,
        name: student.name,
        collegeId: student.collegeId,
        semester: student.semester
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating student for CR:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}