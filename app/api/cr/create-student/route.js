// app/api/cr/create-student/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import Log from "@/app/models/Log";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function POST(request) {
  try {
    await connectToDatabase();

    // Verify CR is authenticated
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      // Log unauthorized attempt
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
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { name, collegeId, phone, email, semester } = await request.json();

    // Log student creation attempt
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
          email: currentUser.email,
          semester: currentUser.semester,
          session: currentUser.session
        },
        studentData: {
          name: name,
          collegeId: collegeId,
          phone: phone || 'Not provided',
          email: email || 'Not provided',
          semester: semester || currentUser.semester
        },
        timestamp: new Date().toISOString()
      })
    });

    // Validate required fields
    if (!name || !collegeId) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Creation Failed - Missing Required Fields",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          missingFields: {
            name: !name,
            collegeId: !collegeId
          },
          providedData: {
            name: name || 'missing',
            collegeId: collegeId || 'missing',
            phone: phone || 'not provided',
            email: email || 'not provided'
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Name and College ID are required" },
        { status: 400 },
      );
    }

    // Validate college ID format
    if (!/^\d{6}$/.test(collegeId)) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Creation Failed - Invalid College ID Format",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          attemptedCollegeId: collegeId,
          expectedFormat: "6 digits (e.g., 521017)",
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "College ID must be 6 digits" },
        { status: 400 },
      );
    }

    // Check if student already exists
    const existingStudent = await User.findOne({ collegeId });
    if (existingStudent) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_CREATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Creation Failed - College ID Already Exists",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          attemptedCollegeId: collegeId,
          existingStudent: {
            id: existingStudent._id,
            name: existingStudent.name,
            collegeId: existingStudent.collegeId,
            email: existingStudent.email,
            role: existingStudent.role,
            status: existingStudent.status
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        {
          success: false,
          message: "Student with this College ID already exists",
        },
        { status: 409 },
      );
    }

    // Check if email is already in use (if provided)
    if (email && email.trim() !== "") {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_CREATE",
          resourceType: "user",
          details: JSON.stringify({
            action: "Student Creation Failed - Email Already Exists",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId
            },
            attemptedEmail: email,
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
            message: "Student with this email already exists",
          },
          { status: 409 },
        );
      }
    }

    // 1. Create a base object with required fields
    const studentData = {
      name,
      collegeId,
      phone: phone || null,
      semester: currentUser.semester,
      session: currentUser.session,
      role: "student",
      status: "active",
    };

    // 2. Only add email if it's actually provided
    if (email && email.trim() !== "") {
      studentData.email = email.toLowerCase();
    }

    // 3. Save using the object we built
    const student = await User.create(studentData);

    // Log successful student creation
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
          email: currentUser.email,
          semester: currentUser.semester,
          session: currentUser.session
        },
        student: {
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          email: student.email || 'Not provided',
          phone: student.phone || 'Not provided',
          semester: student.semester,
          session: student.session,
          role: student.role,
          status: student.status,
          createdAt: student.createdAt
        },
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json(
      {
        success: true,
        message: "Student added successfully",
        data: {
          id: student._id,
          name: student.name,
          collegeId: student.collegeId,
          semester: student.semester,
          session: student.session,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating student for CR:", error);
    
    // Log error with details
    try {
      const { name, collegeId, email } = await request.json().catch(() => ({}));
      
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
            name: name || 'Not provided',
            collegeId: collegeId || 'Not provided',
            email: email || 'Not provided'
          },
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
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}