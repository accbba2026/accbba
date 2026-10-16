// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { verifyTokenForServer } from "../../../lib/authUtils";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";

export async function GET(request) {
  try {
    // Get token from cookie or Authorization header
    const token =
      request.cookies.get("auth_token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify JWT (no expiry check since we removed expiresIn)
    const decoded = verifyTokenForServer(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get full user data
    const user = await User.findById(decoded.id).select("-password -__v");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if account is active
    if (user.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Account deactivated" },
        { status: 403 }
      );
    }

    // ✅ CRITICAL: Validate session token matches DB
    // If user logged in from another device, sessionToken changed
    // and this device's JWT now has a stale sessionToken
    if (user.sessionToken !== decoded.sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Session expired. Please login again.",
        },
        { status: 401 }
      );
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        fullName: user.fullName || user.name,
        email: user.email,
        phone: user.phone,
        collegeId: user.collegeId,
        studentId: user.studentId,
        department: user.department,
        semester: user.semester,
        session: user.session,
        role: user.role,
        status: user.status,
        isDepthead: user.isDepthead,
        isVerified: user.isVerified,
        isActive: user.isActive,
        noticeMail: user.noticeMail,
        personalInfo: user.personalInfo || {},
        profilePicture: user.personalInfo?.profilePicture || null,
        guardianInfo: user.guardianInfo || {},
        academicInfo: user.academicInfo || {},
        skills: user.skills || [],
        interests: user.interests || [],
        experience: user.experience || {},
        careerClubInfo: user.careerClubInfo || {},
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get user data",
        error: error.message,
      },
      { status: 500 }
    );
  }
}