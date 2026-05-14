// app/api/user/create-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

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
    
    const currentUser = await getCurrentUser();
    
    // Check if user is authenticated and has proper role
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'faculty')) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Unauthorized Student Creation Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    console.log('Received student data:', body);
    
    // Validate input data
    const validationErrors = validateStudentData(body);
    if (validationErrors.length > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Creation Failed - Validation Error",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role,
            email: currentUser.email
          },
          validationErrors: validationErrors,
          attemptedData: {
            name: body.name || 'missing',
            collegeId: body.collegeId || 'missing',
            semester: body.semester || 'missing',
            session: body.session || 'missing',
            phone: body.phone || 'not provided',
            email: body.email || 'not provided',
            role: body.role || 'student'
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          errors: validationErrors 
        },
        { status: 400 }
      );
    }
    
    // Log creation attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_CREATE",
      resourceType: "user",
      details: JSON.stringify({
        action: "Student Creation Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        studentData: {
          name: body.name,
          collegeId: body.collegeId,
          semester: body.semester || '1st',
          session: body.session,
          phone: body.phone || 'not provided',
          email: body.email || 'not provided',
          status: body.status || 'active',
          role: body.role || 'student'
        },
        timestamp: new Date().toISOString()
      })
    });
    
    // Check if student with same college ID already exists
    const existingStudent = await User.findOne({ collegeId: body.collegeId });
    if (existingStudent) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Creation Failed - Duplicate College ID",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          attemptedCollegeId: body.collegeId,
          existingStudent: {
            id: existingStudent._id,
            name: existingStudent.name,
            collegeId: existingStudent.collegeId,
            email: existingStudent.email,
            role: existingStudent.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
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
      const existingEmail = await User.findOne({ email: body.email.toLowerCase().trim() });
      if (existingEmail) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_CREATE",
          resourceType: "user",
          details: JSON.stringify({
            action: "Student Creation Failed - Duplicate Email",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role
            },
            attemptedEmail: body.email,
            existingUser: {
              id: existingEmail._id,
              name: existingEmail.name,
              collegeId: existingEmail.collegeId,
              email: existingEmail.email,
              role: existingEmail.role
            },
            timestamp: new Date().toISOString()
          })
        });
        
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
    
    console.log('Created student:', student);
    
    // Log successful creation
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_CREATE",
      resourceType: "user",
      resourceId: student._id,
      details: JSON.stringify({
        action: "Student Created Successfully",
        createdBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        student: {
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          semester: student.semester,
          session: student.session,
          phone: student.phone || 'Not provided',
          email: student.email || 'Not provided',
          status: student.status,
          role: student.role,
          createdAt: student.createdAt
        },
        timestamp: new Date().toISOString()
      })
    });
    
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
    
    // Log error with details
    try {
      const body = await request.json().catch(() => ({}));
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Creation Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedData: {
            name: body.name || 'Not provided',
            collegeId: body.collegeId || 'Not provided',
            semester: body.semester || 'Not provided',
            session: body.session || 'Not provided',
            email: body.email || 'Not provided'
          },
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            keyPattern: error.keyPattern,
            keyValue: error.keyValue,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
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