// app/models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    semester: {
      type: String,
      required: true,
      enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
    },
    inputBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
attendanceSchema.index({ createdAt: -1 });

const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export default Attendance;
