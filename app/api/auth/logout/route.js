// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { clearAuthCookie, verifyTokenForServer } from "@/app/lib/authUtils";
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";

export async function POST(request) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (token) {
      const decoded = verifyTokenForServer(token);
      if (decoded) {
        await connectToDatabase();
        // ✅ Clear sessionToken so this JWT can't be reused
        await User.findByIdAndUpdate(decoded.id, { sessionToken: null });
      }
    }

    await clearAuthCookie();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}