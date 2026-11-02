// app/api/user/blood/update-history/route.js
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
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = verifyTokenForServer(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { donationDate } = body;

    if (!donationDate) {
      return NextResponse.json(
        { success: false, message: "Donation date is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.bloodDonationDates) {
      user.bloodDonationDates = [];
    }
    user.bloodDonationDates.push(new Date(donationDate));

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Donation date added successfully",
      bloodDonationDates: user.bloodDonationDates,
    });
  } catch (error) {
    console.error("Update donation history error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update history", error: error.message },
      { status: 500 }
    );
  }
}