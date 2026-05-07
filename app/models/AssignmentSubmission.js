// app/models/AssignmentSubmission.js
import mongoose from "mongoose";

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["onTime", "late"],
      default: "onTime",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
assignmentSubmissionSchema.index({ student: 1 });
assignmentSubmissionSchema.index({ assignment: 1 });
assignmentSubmissionSchema.index({ status: 1 });
assignmentSubmissionSchema.index({ submittedAt: -1 });

const AssignmentSubmission = mongoose.models.AssignmentSubmission || 
  mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);

export default AssignmentSubmission;