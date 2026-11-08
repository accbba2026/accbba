// app/api/user/blood/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";
import { verifyTokenForServer } from "../../../lib/authUtils";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bloodGroup = searchParams.get("bloodGroup");
    const currentSemester = searchParams.get("semester");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    if (!bloodGroup) {
      return NextResponse.json(
        { success: false, message: "Blood group is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Authenticate the requester
    let requesterRole = "guest";
    let requesterBloodGroup = null;
    const token =
      request.cookies.get("auth_token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = verifyTokenForServer(token);
      if (decoded) {
        const requester = await User.findById(decoded.id)
          .select("role bloodGroup")
          .lean();
        if (requester) {
          requesterRole = requester.role;
          requesterBloodGroup = requester.bloodGroup;
        }
      }
    }

    // ✅ Block students who haven't set their own blood group
    if (
      requesterRole === "student" &&
      (!requesterBloodGroup || requesterBloodGroup.trim() === "")
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "BLOOD_GROUP_NOT_SET",
          message:
            "আপনার নিজের ব্লাড গ্রুপ আপডেট করা নেই, অন্যদের ব্লাড গ্রুপ দেখতে আগে CR এর মাধ্যমে আপনার নিজের ব্লাড গ্রুপ আপডেট করান, অথবা একদম নিচে এডমিনের সাথে যোগাযোগ করুন",
        },
        { status: 403 }
      );
    }

    // Base query: Match blood group and only active users
    const baseQuery = {
      bloodGroup: bloodGroup,
      status: "active",
    };

    // 2. Fetch same semester users first
    const sameSemesterUsers = await User.find({
      ...baseQuery,
      semester: currentSemester,
    })
      .select(
        "name collegeId semester bloodGroup bloodDonationDates phone email session role"
      )
      .sort({ name: 1 })
      .lean();

    // 3. Fetch other semester users
    const otherSemesterUsers = await User.find({
      ...baseQuery,
      semester: { $ne: currentSemester },
    })
      .select(
        "name collegeId semester bloodGroup bloodDonationDates phone email session role"
      )
      .sort({ semester: 1, name: 1 })
      .lean();

    // ❌ REMOVED: The privacy check block that hid phone numbers for other semesters.

    // Combine them
    const allUsers = [...sameSemesterUsers, ...otherSemesterUsers];

    // Paginate the combined list manually
    const paginatedUsers = allUsers.slice(skip, skip + limit);
    const totalUsers = allUsers.length;
    const hasMore = skip + limit < totalUsers;

    return NextResponse.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Blood search error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users", error: error.message },
      { status: 500 }
    );
  }
}