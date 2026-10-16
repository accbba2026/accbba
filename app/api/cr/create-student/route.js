// app/api/cr/create-student/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

// ✅ Valid blood groups
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export async function POST(request) {
  try {
    await connectToDatabase();

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'cr') {
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_CREATE',
        resourceType: 'user',
        details: JSON.stringify({
          action: 'Unauthorized Student Creation Attempt',
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
    const { name, collegeId, phone, email, semester, bloodGroup } = await request.json();

    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: 'USER_CREATE',
      resourceType: 'user',
      details: JSON.stringify({
        action: 'Student Creation Attempt',
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          semester: currentUser.semester,
        },
        studentData: {
          name,
          collegeId,
          phone: phone || 'Not provided',
          email: email || 'Not provided',
          bloodGroup: bloodGroup || 'Not provided',
          semester: semester || currentUser.semester,
        },
        timestamp: new Date().toISOString(),
      }),
    });

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

    // ✅ Validate blood group (optional)
    if (bloodGroup && bloodGroup.trim() && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return NextResponse.json(
        {
          success: false,
          message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check duplicates
    const existingStudent = await User.findOne({ collegeId });
    if (existingStudent) {
      return NextResponse.json(
        { success: false, message: 'Student with this College ID already exists' },
        { status: 409 }
      );
    }

    if (email && email.trim() !== '') {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Student with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Build student data
    const studentData = {
      name,
      collegeId,
      phone: phone || null,
      semester: currentUser.semester,
      session: currentUser.session,
      role: 'student',
      status: 'active',
    };

    if (email && email.trim() !== '') studentData.email = email.toLowerCase();
    // ✅ Blood group
    if (bloodGroup && bloodGroup.trim() !== '') studentData.bloodGroup = bloodGroup;

    const student = await User.create(studentData);

    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: 'USER_CREATE',
      resourceType: 'user',
      resourceId: student._id,
      details: JSON.stringify({
        action: 'Student Created Successfully',
        createdBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          semester: currentUser.semester,
        },
        student: {
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          email: student.email || 'Not provided',
          phone: student.phone || 'Not provided',
          bloodGroup: student.bloodGroup || 'Not provided',
          semester: student.semester,
          session: student.session,
          role: student.role,
          status: student.status,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Student added successfully',
        data: {
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          semester: student.semester,
          session: student.session,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating student for CR:', error);

    try {
      const { name, collegeId, email } = await request.json().catch(() => ({}));
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: 'USER_CREATE',
        resourceType: 'user',
        details: JSON.stringify({
          action: 'Student Creation Failed - System Error',
          user: currentUser
            ? {
                id: currentUser._id,
                name: currentUser.name,
                collegeId: currentUser.collegeId,
                role: currentUser.role,
              }
            : null,
          attemptedData: {
            name: name || 'Not provided',
            collegeId: collegeId || 'Not provided',
            email: email || 'Not provided',
          },
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