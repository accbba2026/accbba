// app/api/user/update-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { generateRandomPassword, hashPassword } from '@/app/lib/passwordUtils';
import { sendCredentialsEmail } from '@/app/lib/emailService';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { id, name, phone, email, semester, session, status, role, password } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current student to check role change
    const currentStudent = await User.findById(id).select('+password');
    if (!currentStudent) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }
    
    const wasCR = currentStudent.role === 'cr';
    const isBecomingCR = role === 'cr' && !wasCR;
    
    // Validate phone (optional)
    if (phone && phone.trim()) {
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(phone)) {
        return NextResponse.json(
          { success: false, message: 'Phone number must be a valid Bangladeshi number' },
          { status: 400 }
        );
      }
    }
    
    // Email validation - REQUIRED for CR role
    if (role === 'cr') {
      if (!email || !email.trim()) {
        return NextResponse.json(
          { success: false, message: 'Email is required for Class Representative (CR) role' },
          { status: 400 }
        );
      }
      
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        return NextResponse.json(
          { success: false, message: 'Please enter a valid email address for CR' },
          { status: 400 }
        );
      }
      
      // Check if email is taken by another student
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: id } 
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Email already exists for another student' },
          { status: 409 }
        );
      }
    } else {
      // For non-CR roles, email is optional but must be valid if provided
      if (email && email.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          return NextResponse.json(
            { success: false, message: 'Please enter a valid email address' },
            { status: 400 }
          );
        }
        
        const existingEmail = await User.findOne({ 
          email: email.toLowerCase(), 
          _id: { $ne: id } 
        });
        if (existingEmail) {
          return NextResponse.json(
            { success: false, message: 'Email already exists for another student' },
            { status: 409 }
          );
        }
      }
    }
    
    // Validate semester
    const validSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'graduated'];
    if (semester && !validSemesters.includes(semester)) {
      return NextResponse.json(
        { success: false, message: 'Invalid semester' },
        { status: 400 }
      );
    }
    
    // Validate session format
    if (session && session.trim()) {
      const sessionPattern = /^\d{4}-\d{2,4}$/;
      if (!sessionPattern.test(session)) {
        return NextResponse.json(
          { success: false, message: 'Session must be in format like "2021-22" or "2021-2022"' },
          { status: 400 }
        );
      }
    }
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'graduated', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ['student', 'admin', 'faculty', 'cr'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim().toLowerCase() || null;
    if (semester) updateData.semester = semester;
    if (session) updateData.session = session;
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    
    // Handle password for CR role
    let generatedPassword = null;
    let shouldSendEmail = false;
    
    if (isBecomingCR) {
      // Generate random password
      generatedPassword = password || generateRandomPassword(10);
      const hashedPassword = await hashPassword(generatedPassword);
      updateData.password = hashedPassword;
      shouldSendEmail = true;
    } else if (password && password.trim()) {
      // Update existing password if provided
      const hashedPassword = await hashPassword(password);
      updateData.password = hashedPassword;
    }
    
    // Update the student
    const updatedStudent = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedStudent) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }
    
    // Send email if user became CR
    if (shouldSendEmail && updatedStudent.email) {
      const emailSent = await sendCredentialsEmail(
        updatedStudent.email,
        updatedStudent.name,
        generatedPassword,
        updatedStudent.collegeId
      );
      
      if (!emailSent) {
        console.warn('Email sending failed for CR:', updatedStudent.email);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: shouldSendEmail 
        ? 'Student updated successfully! Credentials have been sent to their email.'
        : 'Student updated successfully',
      data: updatedStudent,
      passwordSent: shouldSendEmail
    });
    
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}