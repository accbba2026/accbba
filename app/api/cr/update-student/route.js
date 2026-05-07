// app/api/cr/update-student/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function PUT(request) {
  try {
    await connectToDatabase();

    // Verify CR is authenticated
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { id, name, phone, email } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Student ID is required" },
        { status: 400 },
      );
    }

    // Get the student to verify they are in CR's semester
    const student = await User.findById(id);

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    // Verify student is in CR's semester
    if (student.semester !== currentUser.semester) {
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
      return NextResponse.json(
        { success: false, message: "Can only update student accounts" },
        { status: 403 },
      );
    }

    // Validate phone if provided
    if (phone && phone.trim()) {
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(phone)) {
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
        return NextResponse.json(
          {
            success: false,
            message: "Email already exists for another student",
          },
          { status: 409 },
        );
      }
    }

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

    // Handle email - This is the critical part for your E11000 error
    if (email !== undefined) {
      if (email && email.trim() !== "") {
        updateData.email = email.trim().toLowerCase();
      } else {
        unsetData.email = "";
      }
    }

    // 2. Perform the update with $set and $unset
    const updatedStudent = await User.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        ...(Object.keys(unsetData).length > 0 ? { $unset: unsetData } : {}),
      },
      { new: true, runValidators: true },
    ).select("-password");

    return NextResponse.json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student for CR:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
