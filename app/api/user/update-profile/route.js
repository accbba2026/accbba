// app/api/user/update-profile/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_MAJORS = [
  'finance & banking',
  'marketing',
  'management',
  'accounting',
];
const SENIOR_SEMESTERS = ['7th', '8th'];

export async function PUT(request) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser();

    // ✅ parse body ONCE (was parsed twice in old catch block → error)
    const body = await request.json();
    const { id, name, phone, email, bloodGroup, major } = body;

    if (!id) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_UPDATE',
        resourceType: 'profile',
        details: JSON.stringify({
          action: 'Profile Update Failed - Missing ID',
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get original user data before update
    const originalUser = await User.findById(id).select(
      'name phone email role collegeId semester bloodGroup major'
    );

    if (!originalUser) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_UPDATE',
        resourceType: 'profile',
        resourceId: id,
        details: JSON.stringify({
          action: 'Profile Update Failed - User Not Found',
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          userId: id,
          timestamp: new Date().toISOString(),
        }),
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
        action: 'USER_UPDATE',
        resourceType: 'profile',
        resourceId: id,
        details: JSON.stringify({
          action: 'Unauthorized Profile Update Attempt',
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          attemptedUser: {
            id: originalUser._id,
            name: originalUser.name,
            role: originalUser.role,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { success: false, message: 'You can only update your own profile' },
        { status: 403 }
      );
    }

    // ---- Validation ----
    const validationErrors = [];

    if (phone !== undefined && phone && phone.trim()) {
      if (!/^01[3-9]\d{8}$/.test(phone)) {
        validationErrors.push('Phone number must be a valid Bangladeshi number');
      }
    }

    if (email !== undefined && email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationErrors.push('Please enter a valid email address');
      } else {
        const existingEmail = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: id },
        });
        if (existingEmail) {
          validationErrors.push('Email already exists for another user');
        }
      }
    }

    // ✅ Blood group validation
    if (
      bloodGroup !== undefined &&
      bloodGroup !== null &&
      bloodGroup !== '' &&
      !VALID_BLOOD_GROUPS.includes(bloodGroup)
    ) {
      validationErrors.push(
        `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`
      );
    }

    // ✅ Major validation — only allowed for 7th & 8th semester
    const isSeniorSemester = SENIOR_SEMESTERS.includes(originalUser.semester);
    const majorProvided = major !== undefined && major !== null && major !== '';

    if (majorProvided && !isSeniorSemester) {
      validationErrors.push(
        `Major can only be set for 7th & 8th semester (current: ${originalUser.semester})`
      );
    }
    if (majorProvided && !VALID_MAJORS.includes(major)) {
      validationErrors.push(
        `Major must be one of: ${VALID_MAJORS.join(', ')}`
      );
    }

    if (validationErrors.length > 0) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_UPDATE',
        resourceType: 'profile',
        resourceId: id,
        details: JSON.stringify({
          action: 'Profile Update Failed - Validation Error',
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          validationErrors,
          attemptedData: {
            name: name || 'Not changing',
            phone: phone || 'Not changing',
            email: email || 'Not changing',
            bloodGroup: bloodGroup || 'Not changing',
            major: major || 'Not changing',
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { success: false, message: validationErrors[0] },
        { status: 400 }
      );
    }

    // ---- Build update object ----
    const updateData = {};
    const unsetData = {};
    const changes = [];

    if (name && name !== originalUser.name) {
      updateData.name = name;
      changes.push(`Name: "${originalUser.name}" → "${name}"`);
    }

    if (phone !== undefined) {
      const newPhone = phone?.trim() || null;
      const oldPhone = originalUser.phone || 'Not set';
      if (newPhone !== originalUser.phone) {
        if (newPhone) updateData.phone = newPhone;
        else unsetData.phone = '';
        changes.push(`Phone: "${oldPhone}" → "${newPhone || 'Removed'}"`);
      }
    }

    if (email !== undefined) {
      const newEmail = email?.trim().toLowerCase() || null;
      const oldEmail = originalUser.email || 'Not set';
      if (newEmail !== originalUser.email) {
        if (newEmail) updateData.email = newEmail;
        else unsetData.email = '';
        changes.push(`Email: "${oldEmail}" → "${newEmail || 'Removed'}"`);
      }
    }

    // ✅ Blood group
    if (bloodGroup !== undefined) {
      const newBg = bloodGroup?.trim() || null;
      const oldBg = originalUser.bloodGroup || 'Not set';
      if (newBg !== originalUser.bloodGroup) {
        if (newBg) updateData.bloodGroup = newBg;
        else unsetData.bloodGroup = '';
        changes.push(`Blood Group: "${oldBg}" → "${newBg || 'Removed'}"`);
      }
    }

    // ✅ Major — only for 7th/8th semester
    if (isSeniorSemester && major !== undefined) {
      const newMajor = major?.trim() || null;
      const oldMajor = originalUser.major || 'Not set';
      if (newMajor !== originalUser.major) {
        if (newMajor) updateData.major = newMajor;
        else unsetData.major = '';
        changes.push(`Major: "${oldMajor}" → "${newMajor || 'Removed'}"`);
      }
    }

    // Log update attempt
    await Log.create({
      user: currentUser?._id || null,
      userRole: currentUser?.role || 'unknown',
      action: 'USER_UPDATE',
      resourceType: 'profile',
      resourceId: id,
      details: JSON.stringify({
        action: 'Profile Update Attempt',
        user: currentUser
          ? {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role,
              email: currentUser.email,
            }
          : null,
        originalProfile: {
          id: originalUser._id,
          name: originalUser.name,
          email: originalUser.email || 'Not set',
          phone: originalUser.phone || 'Not set',
          bloodGroup: originalUser.bloodGroup || 'Not set',
          major: originalUser.major || 'Not set',
          semester: originalUser.semester,
          role: originalUser.role,
          collegeId: originalUser.collegeId,
        },
        updateData: {
          name: name || 'Not changing',
          phone: phone !== undefined ? phone || 'Will be removed' : 'Not changing',
          email: email !== undefined ? email || 'Will be removed' : 'Not changing',
          bloodGroup:
            bloodGroup !== undefined
              ? bloodGroup || 'Will be removed'
              : 'Not changing',
          major:
            isSeniorSemester && major !== undefined
              ? major || 'Will be removed'
              : 'Not changing',
        },
        isSelfUpdate,
        isAdminUpdating: !isSelfUpdate && isAdmin,
        timestamp: new Date().toISOString(),
      }),
    });

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(updateData).length > 0 ? { $set: updateData } : {}),
        ...(Object.keys(unsetData).length > 0 ? { $unset: unsetData } : {}),
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_UPDATE',
        resourceType: 'profile',
        resourceId: id,
        details: JSON.stringify({
          action: 'Profile Update Failed - Update Error',
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          userId: id,
          timestamp: new Date().toISOString(),
        }),
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
      action: 'USER_UPDATE',
      resourceType: 'profile',
      resourceId: id,
      details: JSON.stringify({
        action: 'Profile Updated Successfully',
        updatedBy: currentUser
          ? {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role,
              email: currentUser.email,
            }
          : null,
        updatedProfile: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email || 'Not set',
          phone: updatedUser.phone || 'Not set',
          bloodGroup: updatedUser.bloodGroup || 'Not set',
          major: updatedUser.major || 'Not set',
          semester: updatedUser.semester,
          role: updatedUser.role,
          collegeId: updatedUser.collegeId,
        },
        updateSummary: {
          changesCount: changes.length,
          changes,
          updatedBySelf: isSelfUpdate,
          updatedByAdmin: !isSelfUpdate && isAdmin,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);

    // ✅ FIXED: don't re-read the body — just log the error
    try {
      await Log.create({
        user: null,
        userRole: 'unknown',
        action: 'USER_UPDATE',
        resourceType: 'profile',
        details: JSON.stringify({
          action: 'Profile Update Failed - System Error',
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
        }),
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