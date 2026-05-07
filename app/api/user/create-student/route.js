// app/api/user/create-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

// Validation schemas
const validateStudentData = (data) => {
  const errors = [];
  
  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (data.name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  
  // Phone validation (optional)
  if (data.phone && data.phone.trim()) {
    const phonePattern = /^01[3-9]\d{8}$/;
    if (!phonePattern.test(data.phone)) {
      errors.push('Phone number must be a valid Bangladeshi number (e.g., 01XXXXXXXXX)');
    }
  }
  
  // Email validation (optional)
  if (data.email && data.email.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(data.email)) {
      errors.push('Please enter a valid email address');
    }
  }
  
  // College ID validation
  if (!data.collegeId) {
    errors.push('College ID is required');
  } else if (!/^\d{6}$/.test(data.collegeId.toString())) {
    errors.push('College ID must be a 6-digit number');
  }
  
  // Semester validation
  const validSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  if (data.semester && !validSemesters.includes(data.semester)) {
    errors.push(`Semester must be one of: ${validSemesters.join(', ')}`);
  }
  
  // Session validation
  if (!data.session) {
    errors.push('Session is required');
  } else {
    const sessionPattern = /^\d{4}-\d{2,4}$/;
    if (!sessionPattern.test(data.session)) {
      errors.push('Session must be in format like "2021-22" or "2021-2022"');
    }
  }
  
  // Status validation
  const validStatuses = ['active', 'inactive', 'graduated', 'suspended'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }
  
  // Role validation
  const validRoles = ['student', 'admin', 'faculty', 'cr'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }
  
  return errors;
};

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
    console.log('Received student data:', body); // Debug log
    
    // Validate input data
    const validationErrors = validateStudentData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          errors: validationErrors 
        },
        { status: 400 }
      );
    }
    
    // Check if student with same college ID already exists
    const existingStudent = await User.findOne({ collegeId: body.collegeId });
    if (existingStudent) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Student with this College ID already exists' 
        },
        { status: 409 }
      );
    }
    
    // Check if email is unique (if provided)
    if (body.email && body.email.trim()) {
      const existingEmail = await User.findOne({ email: body.email });
      if (existingEmail) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Email already exists' 
          },
          { status: 409 }
        );
      }
    }
    
    // Create new student with all fields including phone and email
    const studentData = {
      name: body.name.trim(),
      collegeId: body.collegeId,
      semester: body.semester || '1st',
      session: body.session,
      status: body.status || 'active',
      role: body.role || 'student',
    };
    
    // Add optional fields if provided
    if (body.phone && body.phone.trim()) {
      studentData.phone = body.phone.trim();
    }
    if (body.email && body.email.trim()) {
      studentData.email = body.email.trim().toLowerCase();
    }
    
    const student = await User.create(studentData);
    
    console.log('Created student:', student); // Debug log
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Student created successfully',
        data: student 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      },
      { status: 500 }
    );
  }
}