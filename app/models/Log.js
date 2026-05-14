// app/models/Log.js
import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    // Who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["student", "admin", "faculty", "cr"],
      required: true,
    },
    
    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
        // Auth actions
        "REGISTER", "PASSWORD_CHANGE",
        
        // Assignment actions
        "ASSIGNMENT_CREATE", "ASSIGNMENT_UPDATE", "ASSIGNMENT_DELETE",
        "ASSIGNMENT_VIEW", "ASSIGNMENT_SUBMIT", "ASSIGNMENT_SUBMISSION_DELETE",
        "ASSIGNMENT_BULK_SUBMIT",
        
        // Attendance actions
        "ATTENDANCE_MARK", "ATTENDANCE_DELETE", "ATTENDANCE_VIEW",
        
        // Course actions
        "COURSE_CREATE", "COURSE_UPDATE", "COURSE_DELETE", "COURSE_VIEW",
        
        // User management actions
        "USER_CREATE", "USER_UPDATE", "USER_DELETE", "USER_VIEW",
        "USER_ROLE_CHANGE", "USER_STATUS_CHANGE",
        
        // Report actions
        "REPORT_GENERATE", "REPORT_PRINT", "REPORT_EXPORT",
        
        // System actions
        "SYSTEM_LOGIN", "SYSTEM_LOGOUT",
      ],
    },
    
    // On which resource
    resourceType: {
      type: String,
      enum: [
        "assignment", "attendance", "course", "user", "submission", 
        "report", "system", "profile"
      ],
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster queries
logSchema.index({ createdAt: -1 });


const Log = mongoose.models.Log || mongoose.model("Log", logSchema);

export default Log;