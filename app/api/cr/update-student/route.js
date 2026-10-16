// app/api/cr/update-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export async function PUT(request) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'cr') {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_UPDATE',
        resourceType: 'user',
        details: JSON.stringify({
          action: 'Unauthorized Student Update Attempt',
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
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // ✅ Added bloodGroup
    const { id, name, phone, email, bloodGroup } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    const student = await User.findById(id);
    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    const originalStudent = {
      id: student._id,
      name: student.name,
      phone: student.phone,
      email: student.email,
      bloodGroup: student.bloodGroup,
      semester: student.semester,
      role: student.role,
      status: student.status,
      collegeId: student.collegeId,
    };

    // Verify student is in CR's semester
    if (student.semester !== currentUser.semester) {
      return NextResponse.json(
        { success: false, message: 'You can only update students in your semester' },
        { status: 403 }
      );
    }

    // Only allow updating student accounts (not other CRs)
    if (student.role !== 'student') {
      return NextResponse.json(
        { success: false, message: 'Can only update student accounts' },
        { status: 403 }
      );
    }

    // Validate phone
    if (phone && phone.trim()) {
      if (!/^01[3-9]\d{8}$/.test(phone)) {
        return NextResponse.json(
          { success: false, message: 'Phone number must be a valid Bangladeshi number' },
          { status: 400 }
        );
      }
    }

    // Validate email
    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { success: false, message: 'Please enter a valid email address' },
          { status: 400 }
        );
      }

      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Email already exists for another student' },
          { status: 409 }
        );
      }
    }

    // ✅ Validate blood group
    if (bloodGroup !== undefined && bloodGroup !== null && bloodGroup !== '' && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return NextResponse.json(
        {
          success: false,
          message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Track changes
    const updatedFields = [];
    if (name && name !== student.name) updatedFields.push('name');
    if (phone !== undefined && phone !== student.phone) updatedFields.push('phone');
    if (email !== undefined && email !== student.email) updatedFields.push('email');
    if (bloodGroup !== undefined && bloodGroup !== student.bloodGroup) updatedFields.push('bloodGroup');

    // Build update
    const updateData = {};
    const unsetData = {};

    if (name) updateData.name = name;

    if (phone !== undefined) {
      if (phone && phone.trim() !== '') updateData.phone = phone.trim();
      else unsetData.phone = '';
    }

    if (email !== undefined) {
      if (email && email.trim() !== '') updateData.email = email.trim().toLowerCase();
      else unsetData.email = '';
    }

    // ✅ Blood group
    if (bloodGroup !== undefined) {
      if (bloodGroup && bloodGroup.trim() !== '') updateData.bloodGroup = bloodGroup.trim();
      else unsetData.bloodGroup = '';
    }

    const updatedStudent = await User.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 ? { $unset: unsetData } : {}),
      },
      { new: true, runValidators: true }
    ).select('-password');

    // Log success
    const changes = [];
    if (updatedFields.includes('name'))
      changes.push(`Name: "${originalStudent.name}" → "${updatedStudent.name}"`);
    if (updatedFields.includes('phone'))
      changes.push(
        `Phone: "${originalStudent.phone || 'Not set'}" → "${updatedStudent.phone || 'Removed'}"`
      );
    if (updatedFields.includes('email'))
      changes.push(
        `Email: "${originalStudent.email || 'Not set'}" → "${updatedStudent.email || 'Removed'}"`
      );
    if (updatedFields.includes('bloodGroup'))
      changes.push(
        `Blood Group: "${originalStudent.bloodGroup || 'Not set'}" → "${updatedStudent.bloodGroup || 'Removed'}"`
      );

    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: 'USER_UPDATE',
      resourceType: 'user',
      resourceId: id,
      details: JSON.stringify({
        action: 'Student Updated Successfully',
        updatedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          semester: currentUser.semester,
        },
        originalStudent,
        updatedStudent: {
          id: updatedStudent._id,
          name: updatedStudent.name,
          collegeId: updatedStudent.collegeId,
          email: updatedStudent.email || 'Not set',
          phone: updatedStudent.phone || 'Not set',
          bloodGroup: updatedStudent.bloodGroup || 'Not set',
          semester: updatedStudent.semester,
          role: updatedStudent.role,
        },
        updateSummary: {
          fieldsUpdated: updatedFields,
          changesCount: updatedFields.length,
          changes,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    console.error('Error updating student for CR:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}