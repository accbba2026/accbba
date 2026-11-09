// app/api/cr/custom-list/edit/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import CustomList from "@/app/models/CustomList";
import User from "@/app/models/User";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";
import mongoose from "mongoose";

export async function PUT(req) {
  try {
    await connectToDatabase();
    const user = await getCurrentUser();

    if (!user || !["cr", "admin", "faculty"].includes(user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { listId, action, payload } = body;

    if (!listId || !action) {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    }

    const list = await CustomList.findById(listId);
    if (!list) {
      return NextResponse.json({ success: false, message: "List not found" }, { status: 404 });
    }

    switch (action) {
      case "UPDATE_META":
        if (payload.title !== undefined) list.title = payload.title;
        if (payload.firstSubtitle !== undefined) list.firstSubtitle = payload.firstSubtitle;
        if (payload.secondSubtitle !== undefined) list.secondSubtitle = payload.secondSubtitle;
        await list.save();
        break;

      case "ADD_COLUMN":
        if (payload.columnName && !list.columns.includes(payload.columnName)) {
          list.columns.push(payload.columnName);
          await list.save();
        }
        break;

      case "REMOVE_COLUMN":
        list.columns = list.columns.filter((c) => c !== payload.columnName);
        list.rows.forEach((row) => {
          if (row.cells) row.cells.delete(payload.columnName);
        });
        await list.save();
        break;

      case "ADD_STUDENT":
        const studentToAdd = await User.findById(payload.studentId);
        if (!studentToAdd) return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });

        const defaultCols = ["Name", "College ID", "Phone"];
        defaultCols.forEach(col => {
          if (!list.columns.includes(col)) list.columns.push(col);
        });

        const studentExists = list.rows.some(
          (r) => r.studentId && r.studentId.toString() === payload.studentId
        );
        
        if (!studentExists) {
          list.rows.push({ 
            studentId: studentToAdd._id, 
            cells: { 
              Name: studentToAdd.name, 
              "College ID": studentToAdd.collegeId || "", 
              Phone: studentToAdd.phone || ""
            } 
          });
          await list.save();
        }
        break;

      case "ADD_ALL_MY_SEMESTER":
        const semesterStudents = await User.find({
          semester: user.semester,
          role: { $in: ["student", "cr"] },
          collegeId: { $exists: true, $nin: [null, ""] },
        });

        const defaultBulkCols = ["Name", "College ID", "Phone"];
        defaultBulkCols.forEach(col => {
          if (!list.columns.includes(col)) list.columns.push(col);
        });

        const existingIds = list.rows.map((r) => r.studentId?.toString());
        const newStudents = semesterStudents.filter(
          (s) => !existingIds.includes(s._id.toString())
        );

        newStudents.forEach((s) => {
          list.rows.push({ 
            studentId: s._id, 
            cells: { 
              Name: s.name, 
              "College ID": s.collegeId || "", 
              Phone: s.phone || ""
            } 
          });
        });
        await list.save();
        break;

      case "ADD_MANUAL_ROW":
        list.rows.push({ 
           studentId: new mongoose.Types.ObjectId(), 
           cells: { Name: payload.name || "Manual Entry" } 
        });
        await list.save();
        break;

      case "REMOVE_ROW":
        list.rows = list.rows.filter((r) => r._id.toString() !== payload.rowId);
        await list.save();
        break;

      case "UPDATE_CELL":
        const row = list.rows.id(payload.rowId);
        if (row) {
          if (!row.cells) row.cells = new Map();
          row.cells.set(payload.columnName, payload.value);
          row.markModified("cells");
          await list.save();
        }
        return NextResponse.json({ success: true, message: "Cell updated" });

      // ✅ NEW ACTION: Auto-fill a column from database
      case "ADD_USER_FIELD":
        const { fieldName, fieldLabel } = payload;
        
        // 1. Add the column header if it doesn't exist
        if (!list.columns.includes(fieldLabel)) {
          list.columns.push(fieldLabel);
        }

        // 2. Fetch all students who are currently in this list
        const validStudentIds = list.rows
          .filter(r => r.studentId) // Exclude manual entries
          .map(r => r.studentId);

        const dbStudents = await User.find({ _id: { $in: validStudentIds } })
          .select(`_id ${fieldName}`)
          .lean();

        // 3. Map the database data back into the cells
        const studentMap = dbStudents.reduce((acc, curr) => {
          acc[curr._id.toString()] = curr[fieldName];
          return acc;
        }, {});

        list.rows.forEach((row) => {
          if (row.studentId && studentMap[row.studentId.toString()] !== undefined) {
            if (!row.cells) row.cells = new Map();
            row.cells.set(fieldLabel, String(studentMap[row.studentId.toString()] || ""));
          }
        });
        
        await list.save();
        break;

      default:
        return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("Error updating list:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}