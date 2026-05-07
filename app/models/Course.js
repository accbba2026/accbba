// app/models/Course.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
    },
    semester: {
        type: String,
        required: true,
        enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
    },
    teacherName: {
        type: String,
        required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better query performance
courseSchema.index({ createdAt: -1 });

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;
