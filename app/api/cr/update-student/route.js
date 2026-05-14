// app/api/cr/update-student/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import Log from "@/app/models/Log";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function PUT(request) {
  try {
    await connectToDatabase();

    // Verify CR is authenticated
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      // Log unauthorized attempt
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
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { id, name, phone, email } = await request.json();

    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        details: JSON.stringify({
          action: "Student Update Failed - Missing Student ID",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Student ID is required" },
        { status: 400 },
      );
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
          email: currentUser.email,
          semester: currentUser.semester
        },
        updateData: {
          name: name || 'Not changing',
          phone: phone !== undefined ? (phone || 'Will be removed') : 'Not changing',
          email: email !== undefined ? (email || 'Will be removed') : 'Not changing'
        },
        timestamp: new Date().toISOString()
      })
    });

    // Get the student to verify they are in CR's semester and get original data
    const student = await User.findById(id);

    if (!student) {
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
            collegeId: currentUser.collegeId
          },
          studentId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    // Store original student data for comparison
    const originalStudent = {
      id: student._id,
      name: student.name,
      phone: student.phone,
      email: student.email,
      semester: student.semester,
      role: student.role,
      status: student.status,
      collegeId: student.collegeId
    };

    // Verify student is in CR's semester
    if (student.semester !== currentUser.semester) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Student Update Failed - Semester Mismatch",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            userSemester: currentUser.semester
          },
          student: {
            id: student._id,
            name: student.name,
            collegeId: student.collegeId,
            studentSemester: student.semester
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        {
          success: false,
          message: "You can only update students in your semester",
        },
        { status: 403 },
      );
    }

    // Verify student role
    if (student.role !== "student") {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "USER_UPDATE",
        resourceType: "user",
        resourceId: id,
        details: JSON.stringify({
          action: "Student Update Failed - Invalid Role",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          student: {
            id: student._id,
            name: student.name,
            collegeId: student.collegeId,
            role: student.role
          },
          message: "Can only update student accounts",
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Can only update student accounts" },
        { status: 403 },
      );
    }

    // Validate phone if provided
    if (phone && phone.trim()) {
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(phone)) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          resourceId: id,
          details: JSON.stringify({
            action: "Student Update Failed - Invalid Phone Number",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId
            },
            student: {
              id: student._id,
              name: student.name,
              collegeId: student.collegeId
            },
            attemptedPhone: phone,
            expectedFormat: "01XXXXXXXXX (11 digits, starting with 01)",
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json(
          {
            success: false,
            message: "Phone number must be a valid Bangladeshi number",
          },
          { status: 400 },
        );
      }
    }

    // Validate email if provided
    if (email && email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          resourceId: id,
          details: JSON.stringify({
            action: "Student Update Failed - Invalid Email Format",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId
            },
            student: {
              id: student._id,
              name: student.name,
              collegeId: student.collegeId
            },
            attemptedEmail: email,
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json(
          { success: false, message: "Please enter a valid email address" },
          { status: 400 },
        );
      }

      // Check if email is taken by another student
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmail) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "USER_UPDATE",
          resourceType: "user",
          resourceId: id,
          details: JSON.stringify({
            action: "Student Update Failed - Email Already Exists",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId
            },
            student: {
              id: student._id,
              name: student.name,
              collegeId: student.collegeId,
              currentEmail: student.email
            },
            attemptedEmail: email,
            existingUser: {
              id: existingEmail._id,
              name: existingEmail.name,
              collegeId: existingEmail.collegeId,
              email: existingEmail.email
            },
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json(
          {
            success: false,
            message: "Email already exists for another student",
          },
          { status: 409 },
        );
      }
    }

    // Track what fields are being updated
    const updatedFields = [];
    if (name && name !== student.name) updatedFields.push('name');
    if (phone !== undefined && phone !== student.phone) updatedFields.push('phone');
    if (email !== undefined && email !== student.email) updatedFields.push('email');

    // Update student
    const updateData = {};
    const unsetData = {};
    if (name) updateData.name = name;

    // Handle phone
    if (phone !== undefined) {
      if (phone && phone.trim() !== "") {
        updateData.phone = phone.trim();
      } else {
        unsetData.phone = ""; // This will remove the field
      }
    }

    // Handle email
    if (email !== undefined) {
      if (email && email.trim() !== "") {
        updateData.email = email.trim().toLowerCase();
      } else {
        unsetData.email = "";
      }
    }

    // Perform the update with $set and $unset
    const updatedStudent = await User.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 ? { $unset: unsetData } : {}),
      },
      { new: true, runValidators: true },
    ).select("-password");

    // Prepare changes summary
    const changes = [];
    if (updatedFields.includes('name')) changes.push(`Name: "${originalStudent.name}" → "${updatedStudent.name}"`);
    if (updatedFields.includes('phone')) {
      const oldPhone = originalStudent.phone || 'Not set';
      const newPhone = updatedStudent.phone || 'Removed';
      changes.push(`Phone: "${oldPhone}" → "${newPhone}"`);
    }
    if (updatedFields.includes('email')) {
      const oldEmail = originalStudent.email || 'Not set';
      const newEmail = updatedStudent.email || 'Removed';
      changes.push(`Email: "${oldEmail}" → "${newEmail}"`);
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
          email: currentUser.email,
          semester: currentUser.semester
        },
        originalStudent: originalStudent,
        updatedStudent: {
          id: updatedStudent._id,
          name: updatedStudent.name,
          collegeId: updatedStudent.collegeId,
          email: updatedStudent.email || 'Not set',
          phone: updatedStudent.phone || 'Not set',
          semester: updatedStudent.semester,
          role: updatedStudent.role,
          status: updatedStudent.status
        },
        updateSummary: {
          fieldsUpdated: updatedFields,
          changesCount: updatedFields.length,
          changes: changes
        },
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student for CR:", error);
    
    // Log error with details
    try {
      const { id, name, phone, email } = await request.json().catch(() => ({}));
      
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
          attemptedData: {
            studentId: id,
            name: name || 'Not changing',
            phone: phone !== undefined ? (phone || 'Will be removed') : 'Not changing',
            email: email !== undefined ? (email || 'Will be removed') : 'Not changing'
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
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}