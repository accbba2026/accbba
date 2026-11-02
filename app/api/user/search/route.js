// app/api/user/search/route.js
import { NextResponse } from "next/server";
import { verifyTokenForServer } from "../../../lib/authUtils";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";

export async function GET(request) {
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

    // ✅ CRITICAL: Connect to DB BEFORE any queries
    await connectToDatabase();

    const requester = await User.findById(decoded.id).select("role");
    
    if (!requester || !["cr", "admin", "faculty"].includes(requester.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ success: true, users: [] });
    }

    // Search by name, collegeId, phone, or bloodGroup using regex
    const regex = new RegExp(query, "i");
    const users = await User.find({
      $or: [
        { name: regex },
        { collegeId: regex },
        { phone: regex },
        { bloodGroup: regex },
      ],
    })
      .select("name collegeId phone bloodGroup semester session bloodDonationDates")
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, message: "Search failed" }, { status: 500 });
  }
}