// app/api/user/update-profile/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    const { id, name, phone, email } = await request.json();
    
    if (!id) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "profile",
        details: JSON.stringify({
          action: "Profile Update Failed - Missing ID",
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
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get original user data before update
    const originalUser = await User.findById(id).select('name phone email role collegeId');
    
    if (!originalUser) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "profile",
        resourceId: id,
        details: JSON.stringify({
          action: "Profile Update Failed - User Not Found",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          userId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify that the user is updating their own profile or is admin
    const isSelfUpdate = currentUser?._id.toString() === id;
    const isAdmin = currentUser?.role === 'admin';
    
    if (!isSelfUpdate && !isAdmin) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "profile",
        resourceId: id,
        details: JSON.stringify({
          action: "Unauthorized Profile Update Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedUser: {
            id: originalUser._id,
            name: originalUser.name,
            role: originalUser.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'You can only update your own profile' },
        { status: 403 }
      );
    }
    
    // Track changes
    const changes = [];
    const validationErrors = [];
    
    // Validate phone if provided
    if (phone !== undefined && phone && phone.trim()) {
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(phone)) {
        validationErrors.push('Phone number must be a valid Bangladeshi number');
      }
    }
    
    // Validate email if provided
    if (email !== undefined && email && email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        validationErrors.push('Please enter a valid email address');
      } else {
        // Check if email is taken by another user
        const existingEmail = await User.findOne({ 
          email: email.toLowerCase(), 
          _id: { $ne: id } 
        });
        if (existingEmail) {
          validationErrors.push('Email already exists for another user');
        }
      }
    }
    
    if (validationErrors.length > 0) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "profile",
        resourceId: id,
        details: JSON.stringify({
          action: "Profile Update Failed - Validation Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          validationErrors: validationErrors,
          attemptedData: {
            name: name || 'Not changing',
            phone: phone || 'Not changing',
            email: email || 'Not changing'
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
    
    if (name && name !== originalUser.name) {
      updateData.name = name;
      changes.push(`Name: "${originalUser.name}" → "${name}"`);
    }
    
    if (phone !== undefined) {
      const newPhone = phone?.trim() || null;
      const oldPhone = originalUser.phone || 'Not set';
      if (newPhone !== originalUser.phone) {
        updateData.phone = newPhone;
        changes.push(`Phone: "${oldPhone}" → "${newPhone || 'Removed'}"`);
      }
    }
    
    if (email !== undefined) {
      const newEmail = email?.trim().toLowerCase() || null;
      const oldEmail = originalUser.email || 'Not set';
      if (newEmail !== originalUser.email) {
        updateData.email = newEmail;
        changes.push(`Email: "${oldEmail}" → "${newEmail || 'Removed'}"`);
      }
    }
    
    // Log update attempt
    await Log.create({
      user: currentUser?._id || null,
      userRole: currentUser?.role || 'unknown',
      action: "USER_UPDATE",
      resourceType: "profile",
      resourceId: id,
      details: JSON.stringify({
        action: "Profile Update Attempt",
        user: currentUser ? {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        } : null,
        originalProfile: {
          id: originalUser._id,
          name: originalUser.name,
          email: originalUser.email || 'Not set',
          phone: originalUser.phone || 'Not set',
          role: originalUser.role,
          collegeId: originalUser.collegeId
        },
        updateData: {
          name: name || 'Not changing',
          phone: phone !== undefined ? (phone || 'Will be removed') : 'Not changing',
          email: email !== undefined ? (email || 'Will be removed') : 'Not changing'
        },
        isSelfUpdate: isSelfUpdate,
        isAdminUpdating: !isSelfUpdate && isAdmin,
        timestamp: new Date().toISOString()
      })
    });
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "profile",
        resourceId: id,
        details: JSON.stringify({
          action: "Profile Update Failed - Update Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          userId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Log successful update
    await Log.create({
      user: currentUser?._id || null,
      userRole: currentUser?.role || 'unknown',
      action: "USER_UPDATE",
      resourceType: "profile",
      resourceId: id,
      details: JSON.stringify({
        action: "Profile Updated Successfully",
        updatedBy: currentUser ? {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        } : null,
        updatedProfile: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email || 'Not set',
          phone: updatedUser.phone || 'Not set',
          role: updatedUser.role,
          collegeId: updatedUser.collegeId
        },
        updateSummary: {
          changesCount: changes.length,
          changes: changes,
          updatedBySelf: isSelfUpdate,
          updatedByAdmin: !isSelfUpdate && isAdmin
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const user = id ? await User.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "USER_UPDATE",
        resourceType: "profile",
        resourceId: id,
        details: JSON.stringify({
          action: "Profile Update Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          targetUser: user ? {
            id: user._id,
            name: user.name,
            role: user.role
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