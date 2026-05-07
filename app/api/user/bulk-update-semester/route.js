// app/api/user/bulk-update-semester/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Semester progression mapping
const semesterProgression = {
  "1st": "2nd",
  "2nd": "3rd",
  "3rd": "4th",
  "4th": "5th",
  "5th": "6th",
  "6th": "7th",
  "7th": "8th",
  "8th": "graduated",
};

// POST endpoint for bulk semester updates
export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { targetSemester, studentIds, increment, semesterFilter } = body;

    console.log("Bulk semester update request:", {
      targetSemester,
      studentIds,
      increment,
      semesterFilter,
    });

    // Case 1: Bulk increment semester for all active students
    if (increment && !targetSemester) {
      const students = await User.find({
        status: "active",
        semester: { $ne: "graduated" },
        collegeId: { $exists: true, $ne: null, $ne: "" },
      });

      const bulkOps = students
        .map((student) => {
          const nextSemester = semesterProgression[student.semester];
          if (nextSemester) {
            return {
              updateOne: {
                filter: { _id: student._id },
                update: {
                  $set: {
                    semester: nextSemester,
                    status:
                      nextSemester === "graduated" ? "graduated" : "active",
                  },
                },
              },
            };
          }
          return null;
        })
        .filter((op) => op !== null);

      if (bulkOps.length > 0) {
        const result = await User.bulkWrite(bulkOps);
        return NextResponse.json({
          success: true,
          message: `Successfully updated ${result.modifiedCount} students to next semester`,
          data: { modifiedCount: result.modifiedCount },
        });
      } else {
        return NextResponse.json({
          success: true,
          message: "No students to update",
          data: { modifiedCount: 0 },
        });
      }
    }

    // Case 2: Set specific semester for selected students
    if (targetSemester && studentIds && studentIds.length > 0) {
      // Validate semester
      const validSemesters = [
        "1st",
        "2nd",
        "3rd",
        "4th",
        "5th",
        "6th",
        "7th",
        "8th",
        "graduated",
      ];
      if (!validSemesters.includes(targetSemester)) {
        return NextResponse.json(
          { success: false, message: "Invalid semester selected" },
          { status: 400 },
        );
      }

      // Convert string IDs to MongoDB ObjectIds
      const objectIds = studentIds
        .map((id) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (error) {
            return null;
          }
        })
        .filter((id) => id !== null);

      if (objectIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "Invalid student ID format" },
          { status: 400 },
        );
      }

      const result = await User.updateMany(
        { _id: { $in: objectIds } },
        { $set: { semester: targetSemester } },
      );

      return NextResponse.json({
        success: true,
        message: `Updated ${result.modifiedCount} students to ${targetSemester} semester`,
        data: { modifiedCount: result.modifiedCount },
      });
    }

    // Case 3: Update all students in a specific semester
    if (targetSemester && semesterFilter) {
      const result = await User.updateMany(
        { semester: semesterFilter, status: "active" },
        { $set: { semester: targetSemester } },
      );

      return NextResponse.json({
        success: true,
        message: `Updated ${result.modifiedCount} students from ${semesterFilter} to ${targetSemester} semester`,
        data: { modifiedCount: result.modifiedCount },
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid update parameters" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error in bulk semester update:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// GET endpoint for semester statistics
export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    console.log("GET request - action:", action);

    if (action === "stats") {
      // Get semester statistics
      const semesterStats = await User.aggregate([
        {
          $group: {
            _id: "$semester",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      console.log("Semester stats:", semesterStats);

      return NextResponse.json({
        success: true,
        data: semesterStats,
      });
    }

    // Get all active students grouped by semester
    const studentsBySemester = await User.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$semester",
          students: {
            $push: { id: "$_id", name: "$name", collegeId: "$collegeId" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return NextResponse.json({
      success: true,
      data: studentsBySemester,
    });
  } catch (error) {
    console.error("Error fetching semester stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
