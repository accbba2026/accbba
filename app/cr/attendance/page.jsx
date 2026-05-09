// app/cr/attendance/page.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiCalendar,
  FiUsers,
  FiPlus,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiUserPlus,
  FiPrinter,
} from "react-icons/fi";
import { FaUserCheck } from "react-icons/fa";

const CRAttendancePage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRangeMode, setDateRangeMode] = useState(false);

  // Add attendance modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [totalDates, setTotalDates] = useState(0);

  const userSemester = user?.semester || "1st";

  // Convert YYYY-MM-DD to DD-MM-YYYY for display
  const formatToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Format date for display in table headers (short)
  const formatTableDateShort = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Get today's date in YYYY-MM-DD for storage
  const getTodayDateForStorage = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get default date range (last 30 days)
  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return { start: formatDate(start), end: formatDate(end) };
  };

  // Fetch attendance with date range
  const fetchAttendanceWithRange = async (semester, start, end) => {
    if (!semester) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/cr/attendance?semester=${semester}&startDate=${start}&endDate=${end}`,
      );
      const data = await response.json();

      if (data.success) {
        setAttendanceData(data.data);
        const sortedDates = [...data.dates].sort(
          (a, b) => new Date(a) - new Date(b),
        );
        setAttendanceDates(sortedDates);
        setTotalDates(data.totalDates);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setMessage({ type: "error", text: "Failed to load attendance data" });
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      fetchAttendanceWithRange(userSemester, startDate, endDate);
      setDateRangeMode(true);
    }
  };

  // Reset to default (last 30 days)
  const handleResetToDefault = () => {
    const { start, end } = getDefaultDateRange();
    setStartDate(start);
    setEndDate(end);
    setDateRangeMode(false);
    fetchAttendanceWithRange(userSemester, start, end);
  };

  // Handle date selection from date picker
  const handleDateSelect = (e) => {
    const dateValue = e.target.value;
    setSelectedDate(dateValue);
  };

  // Fetch students for the semester
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch(
        `/api/cr/get-students?semester=${userSemester}`,
      );
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage({ type: "error", text: "Failed to load students" });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (user) {
      const { start, end } = getDefaultDateRange();
      //eslint-disable-next-line
      setStartDate(start);
      setEndDate(end);
      fetchStudents();
      fetchAttendanceWithRange(userSemester, start, end);
    }
  }, [user]);

  // Calculate attendance percentage for a student
  const getAttendancePercentage = (studentId) => {
    if (attendanceDates.length === 0) return 0;

    let presentCount = 0;
    attendanceDates.forEach((date) => {
      if (hasAttendance(date, studentId)) {
        presentCount++;
      }
    });

    return ((presentCount / attendanceDates.length) * 100).toFixed(1);
  };

  // Get present count for a student
  const getPresentCount = (studentId) => {
    let presentCount = 0;
    attendanceDates.forEach((date) => {
      if (hasAttendance(date, studentId)) {
        presentCount++;
      }
    });
    return presentCount;
  };

  // Search students by college ID or name
  const handleStudentSearch = (value) => {
    setStudentInput(value);

    if (value.length > 1) {
      const filtered = students.filter(
        (s) =>
          (s.collegeId &&
            s.collegeId.toLowerCase().includes(value.toLowerCase())) ||
          (s.name && s.name.toLowerCase().includes(value.toLowerCase())),
      );
      setStudentSuggestions(filtered.slice(0, 10));
    } else {
      setStudentSuggestions([]);
    }
  };

  // Add student to selection
  const addStudent = (student) => {
    if (!selectedStudentIds.includes(student._id)) {
      setSelectedStudentIds([...selectedStudentIds, student._id]);
    }
    setStudentInput("");
    setStudentSuggestions([]);
  };

  // Add multiple students by college IDs
  const addMultipleStudents = (collegeIdsString) => {
    const ids = collegeIdsString
      .split(/[,\s\n]+/)
      .filter((id) => id.trim().length > 0);
    const newStudentIds = [...selectedStudentIds];
    const notFoundIds = [];

    ids.forEach((collegeId) => {
      const student = students.find(
        (s) =>
          s.collegeId &&
          s.collegeId.toString().trim() === collegeId.toString().trim(),
      );
      if (student && !newStudentIds.includes(student._id)) {
        newStudentIds.push(student._id);
      } else if (!student) {
        notFoundIds.push(collegeId);
      }
    });

    if (notFoundIds.length > 0) {
      setMessage({
        type: "error",
        text: `Student(s) not found: ${notFoundIds.join(", ")}`,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }

    setSelectedStudentIds(newStudentIds);
    setStudentInput("");
    setStudentSuggestions([]);
  };

  // Remove student from selection
  const removeStudent = (studentId) => {
    setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
  };

  // Submit attendance
  const handleSubmitAttendance = async (e) => {
    e.preventDefault();

    if (!selectedDate) {
      setMessage({ type: "error", text: "Please select a date" });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one student" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/cr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          semester: userSemester,
          studentIds: selectedStudentIds,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: data.message,
        });
        setShowAddModal(false);
        setSelectedStudentIds([]);
        setSelectedDate("");
        setStudentInput("");
        await fetchAttendanceWithRange(userSemester, startDate, endDate);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete attendance record
  const handleDeleteAttendance = async (attendanceId, date, studentName) => {
    const displayDate = formatToDDMMYYYY(date);
    if (!confirm(`Remove attendance for ${studentName} on ${displayDate}?`))
      return;

    try {
      const response = await fetch(`/api/cr/attendance?id=${attendanceId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        await fetchAttendanceWithRange(userSemester, startDate, endDate);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  // Check if a student has attendance on a specific date
  const hasAttendance = (date, studentId) => {
    const records = attendanceData[date];
    if (!records) return false;
    return records.some(
      (record) =>
        record.studentId?._id === studentId || record.studentId === studentId,
    );
  };

  // Get attendance record for a student on a specific date
  const getAttendanceRecord = (date, studentId) => {
    const records = attendanceData[date];
    if (!records) return null;
    return records.find(
      (record) =>
        record.studentId?._id === studentId || record.studentId === studentId,
    );
  };

  // Print attendance report
  const handlePrint = () => {
    const printContent = document.getElementById(
      "attendance-print-area",
    ).innerHTML;

    const dateRangeText = `${formatToDDMMYYYY(startDate)} to ${formatToDDMMYYYY(endDate)}`;
    const generatedDate = new Date().toLocaleString();

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${userSemester} Semester</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 10px;
            background: white;
          }
          
          @media print {
            @page {
              size: A4 landscape;
              margin: 0.3cm;
              }
              .print-hide {
              display: none !important;
              }
            
            body {
              padding: 0;
              margin: 0;
            }
            
            .print-header {
              margin-bottom: 15px;
              text-align: center;
            }
            
            .print-header h1 {
              font-size: 14pt;
              margin: 0;
            }
            
            .print-header h2 {
              font-size: 12pt;
              margin: 5px 0;
            }
            
            table {
              font-size: 7pt;
            }
            
            th, td {
              padding: 2px 3px;
            }
          }
          
          .print-header {
            margin-bottom: 20px;
            text-align: center;
          }
          
          .print-header h1 {
            font-size: 18px;
            margin: 0;
          }
          
          .print-header h2 {
            font-size: 16px;
            margin: 5px 0;
            color: #555;
          }
          
          .print-header p {
            font-size: 12px;
            margin: 3px 0;
            color: #777;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 4px 6px;
            text-align: center;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .text-left {
            text-align: left;
          }
          
          .print-footer {
            margin-top: 15px;
            font-size: 9px;
            text-align: center;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>ATTENDANCE REPORT</h1>
          <h2>${userSemester} Semester</h2>
          <p>Period: ${dateRangeText}</p>
          <p>Generated on: ${generatedDate}</p>
        </div>
        
        ${printContent}
        
        <div class="print-footer">
          <p>This is a system generated report. Valid with digital signature.</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiCalendar className="text-3xl text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Attendance Management
                </h1>
              </div>
              <p className="text-gray-600 ml-11">
                Track attendance for {userSemester} Semester students
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                disabled={attendanceDates.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPrinter /> Print Report
              </button>
              <button
                onClick={() => {
                  setSelectedDate(getTodayDateForStorage());
                  setSelectedStudentIds([]);
                  setStudentInput("");
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <FiPlus /> Mark Attendance
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "error" ? <FiAlertCircle /> : <FiCheckCircle />}
            {message.text}
          </div>
        )}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Semester:</span> {userSemester}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-40 text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-40 text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <button
                onClick={handleDateRangeChange}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              >
                Apply Range
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
              >
                Last 30 Days
              </button>
              <button
                onClick={() =>
                  fetchAttendanceWithRange(userSemester, startDate, endDate)
                }
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />{" "}
                Refresh
              </button>
            </div>
          </div>
          {startDate && endDate && (
            <div className="mt-3 text-sm text-gray-500">
              Showing attendance from {formatToDDMMYYYY(startDate)} to{" "}
              {formatToDDMMYYYY(endDate)} ({attendanceDates.length} days)
            </div>
          )}
        </div>

        {/* Attendance Table with Print Area */}
        <div id="attendance-print-area">
          {loadingStudents ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
              <p className="text-gray-500">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <FiUsers className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No students found for {userSemester} semester
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 left-0 bg-gray-50 w-24">
                        College ID
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 left-24 bg-gray-50 w-32">
                        Student Name
                      </th>
                      {attendanceDates.map((date) => (
                        <th
                          key={date}
                          className="px-1 py-2 text-center text-xs font-semibold text-gray-700 min-w-[45px]"
                        >
                          {formatTableDateShort(date)}
                          <div className="text-[9px] font-normal text-gray-400">
                            {new Date(date)
                              .toLocaleDateString("en-GB", { weekday: "short" })
                              .slice(0, 2)}
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-50 min-w-[60px]">
                        P/T
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-50 min-w-[60px]">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((student) => {
                      const presentCount = getPresentCount(student._id);
                      const percentage = getAttendancePercentage(student._id);
                      const isCR = student.isCR || student.role === "cr";
                      return (
                        <tr
                          key={student._id}
                          className={`hover:bg-gray-50 ${isCR ? "bg-blue-50" : ""}`}
                        >
                          <td className="px-2 py-1.5 left-0 bg-white text-xs text-gray-600 font-mono">
                            {student.collegeId}
                          </td>
                          <td className="px-2 py-1.5 left-24 bg-white text-xs text-gray-800 font-medium">
                            {student.name}
                            {isCR && (
                              <span className="ml-1 text-[9px] bg-blue-200 text-blue-700 px-1 rounded">
                                CR
                              </span>
                            )}
                          </td>
                          {attendanceDates.map((date) => {
                            const hasRecord = hasAttendance(date, student._id);
                            const record = getAttendanceRecord(
                              date,
                              student._id,
                            );
                            return (
                              <td
                                key={date}
                                className="px-1 py-1.5 text-center"
                              >
                                {hasRecord ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-green-600 font-bold text-xs">
                                      ✅
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleDeleteAttendance(
                                          record?._id,
                                          date,
                                          student.name,
                                        )
                                      }
                                      className="text-red-400 hover:text-red-600 transition print-hide cursor-pointer"
                                      title="Remove attendance"
                                    >
                                      <FiTrash2 size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 bg-gray-50">
                            {presentCount}/{attendanceDates.length}
                          </td>
                          <td className="px-2 py-1.5 text-center text-xs font-semibold">
                            <span
                              className={`px-1 py-0.5 rounded ${
                                percentage >= 75
                                  ? "text-green-700 font-bold"
                                  : percentage >= 60
                                    ? "text-yellow-700"
                                    : "text-red-700"
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td
                        colSpan="2"
                        className="px-2 py-2 text-xs font-semibold text-gray-700"
                      >
                        Total Classes: {attendanceDates.length}
                      </td>
                      <td
                        colSpan={attendanceDates.length + 2}
                        className="px-2 py-2 text-xs text-gray-500"
                      >
                        ✓ = Present | — = Absent | Click 🗑️ to remove attendance
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {students.length > 0 && attendanceDates.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Total Students</p>
              <p className="text-xl font-bold text-green-700">
                {students.length}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Total Classes</p>
              <p className="text-xl font-bold text-blue-700">
                {attendanceDates.length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Average Attendance</p>
              <p className="text-xl font-bold text-purple-700">
                {(
                  students.reduce(
                    (acc, s) =>
                      acc + parseFloat(getAttendancePercentage(s._id)),
                    0,
                  ) / students.length
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        )}

        {/* Add Attendance Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="top-0 bg-white flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Mark Attendance - {userSemester} Semester
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmitAttendance} className="p-6 space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateSelect}
                    required
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  {selectedDate && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {formatToDDMMYYYY(selectedDate)}
                    </p>
                  )}
                </div>

                {/* Add by College ID */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Add by College ID (comma separated)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="collegeIdsInput"
                      placeholder="e.g., 521017, 521018, 521019"
                      className="flex-1 text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input =
                          document.getElementById("collegeIdsInput");
                        if (input && input.value) {
                          addMultipleStudents(input.value);
                          input.value = "";
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter college IDs separated by commas or spaces
                  </p>
                </div>

                {/* Search and Add Student */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Search and Add Student
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentInput}
                      onChange={(e) => handleStudentSearch(e.target.value)}
                      placeholder="Search by name or college ID..."
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {studentSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                        {studentSuggestions.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => addStudent(student)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                          >
                            <span className="text-gray-700">
                              {student.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {student.collegeId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Students Count */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedStudentIds.length}</strong> student(s)
                    selected
                  </p>
                </div>

                {/* Selected Students List */}
                {selectedStudentIds.length > 0 && (
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Selected Students
                    </label>
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {selectedStudentIds.map((studentId) => {
                        const student = students.find(
                          (s) => s._id === studentId,
                        );
                        if (!student) return null;
                        return (
                          <div
                            key={studentId}
                            className="flex justify-between items-center p-3 border-b border-gray-100"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {student.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {student.collegeId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStudent(studentId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FiX size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      selectedStudentIds.length === 0 ||
                      !selectedDate
                    }
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiUserPlus />
                    {submitting
                      ? "Adding..."
                      : `Mark Attendance (${selectedStudentIds.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRAttendancePage;
