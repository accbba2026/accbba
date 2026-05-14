// app/api/user/update-faculty/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';
import { hashPassword } from '@/app/lib/passwordUtils';
import { sendFacultyPasswordUpdateEmail } from '@/app/lib/emailService';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    // Only admin can update faculty
    if (!currentUser || currentUser.role !== 'admin') {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Unauthorized Faculty Update Attempt",
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
    const { id, name, phone, designation, password } = body;
    
    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Faculty Update Failed - Missing ID",
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
        { success: false, message: 'Faculty ID is required' },
        { status: 400 }
      );
    }
    
    // Get original faculty data before update
    const originalFaculty = await User.findById(id).select('name phone designation email role status');
    
    if (!originalFaculty) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Update Failed - Faculty Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          facultyId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    // Verify the user is actually a faculty member
    if (originalFaculty.role !== 'faculty') {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Update Failed - User is not a Faculty",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          attemptedUser: {
            id: originalFaculty._id,
            name: originalFaculty.name,
            collegeId: originalFaculty.collegeId,
            role: originalFaculty.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'User is not a faculty member' },
        { status: 400 }
      );
    }
    
    // Prepare update data and track changes
    const updateData = {};
    const changes = [];
    let passwordChanged = false;
    let plainPassword = null;
    
    if (name && name !== originalFaculty.name) {
      updateData.name = name;
      changes.push(`Name: "${originalFaculty.name}" → "${name}"`);
    }
    
    if (phone !== undefined) {
      const newPhone = phone?.trim() || null;
      const oldPhone = originalFaculty.phone || 'Not set';
      if (newPhone !== originalFaculty.phone) {
        updateData.phone = newPhone;
        changes.push(`Phone: "${oldPhone}" → "${newPhone || 'Removed'}"`);
      }
    }
    
    if (designation !== undefined) {
      const newDesignation = designation?.trim() || null;
      const oldDesignation = originalFaculty.designation || 'Not set';
      if (newDesignation !== originalFaculty.designation) {
        updateData.designation = newDesignation;
        changes.push(`Designation: "${oldDesignation}" → "${newDesignation || 'Removed'}"`);
      }
    }
    
    if (password && password.trim()) {
      plainPassword = password;
      updateData.password = await hashPassword(password);
      passwordChanged = true;
      changes.push("Password changed");
    }
    
    // Log update attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "USER_UPDATE",
      resourceType: "user",
      resourceId: id,
      details: JSON.stringify({
        action: "Faculty Update Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        originalFaculty: {
          id: originalFaculty._id,
          name: originalFaculty.name,
          email: originalFaculty.email,
          phone: originalFaculty.phone || 'Not set',
          designation: originalFaculty.designation || 'Not set',
          role: originalFaculty.role
        },
        updateData: {
          name: name || 'Not changing',
          phone: phone !== undefined ? (phone || 'Will be removed') : 'Not changing',
          designation: designation !== undefined ? (designation || 'Will be removed') : 'Not changing',
          passwordChanged: passwordChanged
        },
        timestamp: new Date().toISOString()
      })
    });
    
    const updatedFaculty = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedFaculty) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Update Failed - Update Error",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          facultyId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    // Send email if password was changed
    let emailSent = false;
    let emailError = null;
    
    if (passwordChanged && updatedFaculty.email) {
      try {
        await sendFacultyPasswordUpdateEmail(updatedFaculty.email, updatedFaculty.name, plainPassword);
        emailSent = true;
      } catch (error) {
        emailError = error.message;
        console.error('Error sending password email:', error);
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
        action: "Faculty Updated Successfully",
        updatedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        updatedFaculty: {
          id: updatedFaculty._id,
          name: updatedFaculty.name,
          email: updatedFaculty.email,
          phone: updatedFaculty.phone || 'Not set',
          designation: updatedFaculty.designation || 'Not set',
          role: updatedFaculty.role,
          status: updatedFaculty.status
        },
        updateSummary: {
          changesCount: changes.length,
          changes: changes,
          passwordChanged: passwordChanged,
          emailSent: emailSent,
          emailError: emailError
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({
      success: true,
      message: passwordChanged 
        ? 'Faculty updated! New password has been sent to their email.'
        : 'Faculty updated successfully',
      data: updatedFaculty
    });
    
  } catch (error) {
    console.error('Error updating faculty:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const faculty = id ? await User.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Faculty Update Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          faculty: faculty ? {
            id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            role: faculty.role
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
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}