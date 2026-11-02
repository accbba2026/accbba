// app/models/User.js
import mongoose from "mongoose";

const studentCommentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    authorRole: {
      type: String,
      enum: ["admin", "faculty"],
      required: true,
    },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

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
      lowercase: true,
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
    bloodGroup: {
      type: String,
    },
    bloodDonationDates: [{ type: Date }],
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
    major: {
      type: String,
      enum: [
        "finance & banking",
        "marketing",
        "management",
        "accounting",
        null,
      ],
      default: null,
    },
    comments: {
      type: [studentCommentSchema],
      default: [],
    },
    isDepthead: {
      type: Boolean,
      default: false,
    },
    sessionToken: {
      type: String,
      default: null, // Store the current session token
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
userSchema.index({ collegeId: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
