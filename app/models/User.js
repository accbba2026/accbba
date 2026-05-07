// app/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    collegeId: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive", "graduated", "suspended"],
      default: "active",
    },
    semester: {
      type: String,
    },
    designation: {
      type: String,
    },
    session: {
      type: String,
    },
    role: {
      type: String,
      required: true,
      enum: ["student", "admin", "faculty", "cr"],
      default: "student",
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
userSchema.index({ collegeId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
