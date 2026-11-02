// app/api/user/blood/delete-history/route.js
import { NextResponse } from "next/server";
import { verifyTokenForServer } from "../../../../lib/authUtils";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";

export async function POST(request) {
  try {
    const token =
      request.cookies.get("auth_token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const decoded = verifyTokenForServer(token);
    if (!decoded) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Verify Permissions
    const requester = await User.findById(decoded.id).select("role");
    const allowedRoles = ["cr", "admin", "faculty"];
    if (!requester || !allowedRoles.includes(requester.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to delete history" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, donationDate } = body;

    if (!targetUserId || !donationDate) {
      return NextResponse.json(
        { success: false, message: "User ID and Date are required" },
        { status: 400 }
      );
    }

    // 2. Find target user and filter out the specific date
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Filter out the date (comparing time values to be safe)
    const targetTime = new Date(donationDate).getTime();
    targetUser.bloodDonationDates = targetUser.bloodDonationDates.filter(
      (d) => new Date(d).getTime() !== targetTime
    );

    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: "History deleted successfully",
      bloodDonationDates: targetUser.bloodDonationDates,
    });
  } catch (error) {
    console.error("Delete history error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete history", error: error.message },
      { status: 500 }
    );
  }
}