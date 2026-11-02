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

    // 1. Authenticate the requester to know their role
    let requesterRole = "guest";
    const token =
      request.cookies.get("auth_token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = verifyTokenForServer(token);
      if (decoded) {
        // We only need the role, so we can just query the role field
        const requester = await User.findById(decoded.id).select("role").lean();
        if (requester) {
          requesterRole = requester.role;
        }
      }
    }

    await connectToDatabase();

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
      .select("name collegeId semester bloodGroup bloodDonationDates phone email session role")
      .sort({ name: 1 })
      .lean();

    // 3. Fetch other semester users
    const otherSemesterUsers = await User.find({
      ...baseQuery,
      semester: { $ne: currentSemester },
    })
      .select("name collegeId semester bloodGroup bloodDonationDates phone email session role")
      .sort({ semester: 1, name: 1 })
      .lean();

    // 4. Privacy Check: If requester is a student, strip phone numbers from OTHER semesters
    if (requesterRole === "student") {
      otherSemesterUsers.forEach((u) => {
        u.phone = "hidden"; 
      });
    }

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