// app/models/CustomList.js
import mongoose from "mongoose";

// This schema represents a single row in your "Excel Sheet"
const rowSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // ✅ This is the magic part. It stores the dynamic columns.
  // e.g., { "Token Fee": "500", "Payment Status": "Paid", "Note": "Vegetarian" }
  cells: {
    type: Map,
    of: String,
    default: {},
  },
});

const customListSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true, // e.g., "Annual Picnic 2024"
    },
    firstSubtitle: {
      type: String,
    },
    secondSubtitle: {
      type: String,
    },
    // ✅ Array of column headers. e.g., ["Token Fee", "Bus Seat", "Payment Status"]
    columns: [
      {
        type: String,
        required: true,
      },
    ],
    // ✅ Array of rows (students and their dynamic data)
    rows: [rowSchema],
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // To easily filter out old lists
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Prevent model recompilation error in Next.js
const CustomList =
  mongoose.models.CustomList || mongoose.model("CustomList", customListSchema);

export default CustomList;