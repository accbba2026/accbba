// app/api/user/update-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';
import { generateRandomPassword, hashPassword } from '@/app/lib/passwordUtils';
import { sendCredentialsEmail } from '@/app/lib/emailService';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    // Only admin can update students
    if (!currentUser || currentUser.role !== 'admin') {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Unauthorized Student Update Attempt",
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
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { id, name, phone, email, semester, session, status, role, password } = body;
    
    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Update Failed - Missing ID",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current student to check role change and original data
    const currentStudent = await User.findById(id).select('+password');
    if (!currentStudent) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Student Update Failed - Student Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          studentId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }
    
    const wasCR = currentStudent.role === 'cr';
    const isBecomingCR = role === 'cr' && !wasCR;
    const isLosingCR = wasCR && role !== 'cr';
    
    // Track changes
    const changes = [];
    const validationErrors = [];
    
    // Store original data for comparison
    const originalData = {
      name: currentStudent.name,
      phone: currentStudent.phone || 'Not set',
      email: currentStudent.email || 'Not set',
      semester: currentStudent.semester,
      session: currentStudent.session,
      status: currentStudent.status,
      role: currentStudent.role
    };
    
    // Validate phone (optional)
    if (phone && phone.trim()) {
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(phone)) {
        validationErrors.push('Phone number must be a valid Bangladeshi number');
      }
    }
    
    // Email validation - REQUIRED for CR role
    if (role === 'cr') {
      if (!email || !email.trim()) {
        validationErrors.push('Email is required for Class Representative (CR) role');
      } else {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          validationErrors.push('Please enter a valid email address for CR');
        } else {
          // Check if email is taken by another student
          const existingEmail = await User.findOne({ 
            email: email.toLowerCase(), 
            _id: { $ne: id } 
          });
          if (existingEmail) {
            validationErrors.push('Email already exists for another student');
          }
        }
      }
    } else {
      // For non-CR roles, email is optional but must be valid if provided
      if (email && email.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          validationErrors.push('Please enter a valid email address');
        } else {
          const existingEmail = await User.findOne({ 
            email: email.toLowerCase(), 
            _id: { $ne: id } 
          });
          if (existingEmail) {
            validationErrors.push('Email already exists for another student');
          }
        }
      }
    }
    
    // Validate semester
    const validSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'graduated'];
    if (semester && !validSemesters.includes(semester)) {
      validationErrors.push('Invalid semester');
    }
    
    // Validate session format
    if (session && session.trim()) {
      const sessionPattern = /^\d{4}-\d{2,4}$/;
      if (!sessionPattern.test(session)) {
        validationErrors.push('Session must be in format like "2021-22" or "2021-2022"');
      }
    }
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'graduated', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      validationErrors.push('Invalid status');
    }
    
    // Validate role
    const validRoles = ['student', 'admin', 'faculty', 'cr'];
    if (role && !validRoles.includes(role)) {
      validationErrors.push('Invalid role');
    }
    
    if (validationErrors.length > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Student Update Failed - Validation Error",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          validationErrors: validationErrors,
          attemptedData: {
            name: name || 'Not changing',
            phone: phone || 'Not changing',
            email: email || 'Not changing',
            semester: semester || 'Not changing',
            session: session || 'Not changing',
            status: status || 'Not changing',
            role: role || 'Not changing'
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: validationErrors[0] },
        { status: 400 }
      );
    }
    
    // Build update object and track changes
    const updateData = {};
    
    if (name && name !== currentStudent.name) {
      updateData.name = name;
      changes.push(`Name: "${currentStudent.name}" → "${name}"`);
    }
    
    if (phone !== undefined) {
      const newPhone = phone?.trim() || null;
      const oldPhone = currentStudent.phone || 'Not set';
      if (newPhone !== currentStudent.phone) {
        updateData.phone = newPhone;
        changes.push(`Phone: "${oldPhone}" → "${newPhone || 'Removed'}"`);
      }
    }
    
    if (email !== undefined) {
      const newEmail = email?.trim().toLowerCase() || null;
      const oldEmail = currentStudent.email || 'Not set';
      if (newEmail !== currentStudent.email) {
        updateData.email = newEmail;
        changes.push(`Email: "${oldEmail}" → "${newEmail || 'Removed'}"`);
      }
    }
    
    if (semester && semester !== currentStudent.semester) {
      updateData.semester = semester;
      changes.push(`Semester: "${currentStudent.semester}" → "${semester}"`);
    }
    
    if (session && session !== currentStudent.session) {
      updateData.session = session;
      changes.push(`Session: "${currentStudent.session}" → "${session}"`);
    }
    
    if (status && status !== currentStudent.status) {
      updateData.status = status;
      changes.push(`Status: "${currentStudent.status}" → "${status}"`);
    }
    
    if (role && role !== currentStudent.role) {
      updateData.role = role;
      changes.push(`Role: "${currentStudent.role}" → "${role}"`);
      if (isBecomingCR) {
        changes.push("Promoted to Class Representative (CR) - Login credentials will be sent");
      }
      if (isLosingCR) {
        changes.push("Removed from Class Representative (CR) role");
      }
    }
    
    // Handle password for CR role
    let generatedPassword = null;
    let shouldSendEmail = false;
    let passwordChanged = false;
    
    if (isBecomingCR) {
      generatedPassword = password || generateRandomPassword(10);
      const hashedPassword = await hashPassword(generatedPassword);
      updateData.password = hashedPassword;
      shouldSendEmail = true;
      passwordChanged = true;
      changes.push(`New password generated for CR access`);
    } else if (password && password.trim()) {
      const hashedPassword = await hashPassword(password);
      updateData.password = hashedPassword;
      passwordChanged = true;
      changes.push(`Password manually updated`);
    }
    
    // Log update attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_UPDATE",
      resourceType: "user",
      resourceId: id,
      details: JSON.stringify({
        action: "Student Update Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        originalStudent: originalData,
        updateData: {
          name: name || 'Not changing',
          phone: phone !== undefined ? (phone || 'Will be removed') : 'Not changing',
          email: email !== undefined ? (email || 'Will be removed') : 'Not changing',
          semester: semester || 'Not changing',
          session: session || 'Not changing',
          status: status || 'Not changing',
          role: role || 'Not changing'
        },
        changes: changes,
        timestamp: new Date().toISOString()
      })
    });
    
    // Update the student
    const updatedStudent = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedStudent) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Student Update Failed - Update Error",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          studentId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }
    
    // Send email if user became CR
    let emailSent = false;
    let emailError = null;
    
    if (shouldSendEmail && updatedStudent.email) {
      try {
        emailSent = await sendCredentialsEmail(
          updatedStudent.email,
          updatedStudent.name,
          generatedPassword,
          updatedStudent.collegeId
        );
        if (!emailSent) {
          emailError = 'Email sending failed';
          console.warn('Email sending failed for CR:', updatedStudent.email);
        }
      } catch (error) {
        emailError = error.message;
        console.error('Error sending CR credentials email:', error);
      }
    }
    
    // Log successful update
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_UPDATE",
      resourceType: "user",
      resourceId: id,
      details: JSON.stringify({
        action: "Student Updated Successfully",
        updatedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        updatedStudent: {
          id: updatedStudent._id,
          name: updatedStudent.name,
          collegeId: updatedStudent.collegeId,
          email: updatedStudent.email || 'Not set',
          phone: updatedStudent.phone || 'Not set',
          semester: updatedStudent.semester,
          session: updatedStudent.session,
          status: updatedStudent.status,
          role: updatedStudent.role
        },
        updateSummary: {
          changesCount: changes.length,
          changes: changes,
          roleChanged: {
            wasCR: wasCR,
            isNowCR: updatedStudent.role === 'cr',
            credentialsSent: shouldSendEmail && emailSent
          }
        },
        emailNotification: {
          sent: emailSent,
          error: emailError
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({
      success: true,
      message: shouldSendEmail 
        ? 'Student updated successfully! Credentials have been sent to their email.'
        : 'Student updated successfully',
      data: updatedStudent,
      passwordSent: shouldSendEmail && emailSent
    });
    
  } catch (error) {
    console.error('Error updating student:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const student = id ? await User.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Student Update Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          student: student ? {
            id: student._id,
            name: student.name,
            collegeId: student.collegeId,
            role: student.role
          } : { id: id, name: 'Unknown' },
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}