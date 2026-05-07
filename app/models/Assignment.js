// app/models/Assignment.js
import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    chapter: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      required: true,
      enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Cloudinary PDF Storage
    pdfUrl: {
      type: String,
    },
    pdfPublicId: {
      type: String,
    },
    pdfFileName: {
      type: String,
    },
    pdfFileSize: {
      type: Number,
    },
    // Dates
    submissionDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // For tracking
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    // Optional: instructions for students
    instructions: {
      type: String,
      trim: true,
    },
    // Optional: resources/links
    resources: [
      {
        title: String,
        url: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
assignmentSchema.index({ semester: 1 });
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ faculty: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ createdAt: -1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ semester: 1, course: 1 });

// Compound index for efficient queries
assignmentSchema.index({ semester: 1, course: 1, dueDate: 1 });

// Virtual property to check if assignment is overdue
assignmentSchema.virtual("isOverdue").get(function() {
  return this.dueDate < new Date() && this.status === "published";
});

// Virtual property to check if assignment is upcoming
assignmentSchema.virtual("isUpcoming").get(function() {
  return this.dueDate > new Date() && this.status === "published";
});

// Ensure virtuals are included in JSON output
assignmentSchema.set("toJSON", { virtuals: true });
assignmentSchema.set("toObject", { virtuals: true });

const Assignment = mongoose.models.Assignment || mongoose.model("Assignment", assignmentSchema);

export default Assignment;