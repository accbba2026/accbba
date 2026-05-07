// app/api/user/create-faculty/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { generateRandomPassword, hashPassword } from '@/app/lib/passwordUtils';
import { sendFacultyCredentialsEmail } from '@/app/lib/emailService';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { name, email, phone, designation, password } = body;
    
    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 409 }
      );
    }
    
    // Generate college ID for faculty
    const lastFaculty = await User.findOne({ role: 'faculty' }).sort({ collegeId: -1 });
    let collegeId = "FAC001";
    if (lastFaculty && lastFaculty.collegeId) {
      const num = parseInt(lastFaculty.collegeId.replace('FAC', '')) + 1;
      collegeId = `FAC${num.toString().padStart(3, '0')}`;
    }
    
    // Handle password
    const plainPassword = password || generateRandomPassword(10);
    const hashedPassword = await hashPassword(plainPassword);
    
    // Create faculty member
    const faculty = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      collegeId,
      designation: designation || null,
      password: hashedPassword,
      role: 'faculty',
      status: 'active',
    });
    
    // Send email with credentials
    await sendFacultyCredentialsEmail(email, name, plainPassword, collegeId);
    
    return NextResponse.json({
      success: true,
      message: 'Faculty member added successfully! Credentials have been sent to their email.',
      data: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        collegeId: faculty.collegeId
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating faculty:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}