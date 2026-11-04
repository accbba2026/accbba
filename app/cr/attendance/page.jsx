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
  FiSearch,
  FiBriefcase,
  FiInfo,
} from "react-icons/fi";
import { FaUserCheck } from "react-icons/fa";
import { TiTick } from "react-icons/ti";

const SENIOR_SEMESTERS = ["7th", "8th"];
const MAJOR_OPTIONS = [
  "finance & banking",
  "marketing",
  "management",
  "accounting",
];

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

  // ✅ NEW — Major filter (7th/8th only)
  const [majorFilter, setMajorFilter] = useState("finance & banking");

  // Add attendance modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [totalDates, setTotalDates] = useState(0);

  // Senior-only state
  const [classSessions, setClassSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionMajor, setSessionMajor] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const userSemester = user?.semester || "1st";
  const isSenior = SENIOR_SEMESTERS.includes(userSemester);

  // ---- helpers ----
  const formatToDDMMYYYY = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
  };

  const formatTableDateShort = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const getTodayDateForStorage = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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

  // ---- fetch attendance ----
  const fetchAttendanceWithRange = async (semester, start, end, major = "") => {
    if (!semester) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        semester,
        startDate: start,
        endDate: end,
      });
      if (major) params.set("major", major);

      const response = await fetch(`/api/cr/attendance?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAttendanceData(data.data);
        const sortedDates = [...data.dates].sort(
          (a, b) => new Date(a) - new Date(b),
        );
        setAttendanceDates(sortedDates);
        setTotalDates(data.totalDates);

        if (data.mode === "session") {
          setClassSessions(data.sessions || []);
        } else {
          setClassSessions([]);
        }
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to load attendance data",
        });
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setMessage({ type: "error", text: "Failed to load attendance data" });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      fetchAttendanceWithRange(userSemester, startDate, endDate, majorFilter);
    }
  };

  const handleResetToDefault = () => {
    const { start, end } = getDefaultDateRange();
    setStartDate(start);
    setEndDate(end);
    fetchAttendanceWithRange(userSemester, start, end, majorFilter);
  };

  // ✅ NEW — major filter change handler
  const handleMajorFilterChange = (newMajor) => {
    setMajorFilter(newMajor);
    if (startDate && endDate) {
      fetchAttendanceWithRange(userSemester, startDate, endDate, newMajor);
    }
    // Reload the student roster for that major too
    fetchStudents(newMajor);
  };

  // ---- fetch students ----
  // ✅ majorOverride — if provided, fetch students of that specific major
  const fetchStudents = async (majorOverride) => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ semester: userSemester });
      const m = majorOverride !== undefined ? majorOverride : majorFilter;
      if (m) params.set("major", m);

      const response = await fetch(`/api/cr/get-students?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to load students",
        });
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage({ type: "error", text: "Failed to load students" });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (user) {
      const { start, end } = getDefaultDateRange();
      //eslint-disable-next-line
      setStartDate(start);
      setEndDate(end);

      // ✅ For 7th/8th default to "finance & banking", for others use ""
      const isSeniorUser = ["7th", "8th"].includes(userSemester);
      const initialMajor = isSeniorUser ? "finance & banking" : "";

      setMajorFilter(initialMajor);
      fetchStudents(initialMajor);
      fetchAttendanceWithRange(userSemester, start, end, initialMajor);
    }
    //eslint-disable-next-line
  }, [user]);

  // ---- attendance math ----
  const getAttendancePercentage = (studentId) => {
    const total = isSenior ? classSessions.length : attendanceDates.length;
    if (total === 0) return 0;

    let presentCount = 0;
    if (isSenior) {
      classSessions.forEach((s) => {
        if (hasAttendance(s.date, studentId)) presentCount++;
      });
    } else {
      attendanceDates.forEach((date) => {
        if (hasAttendance(date, studentId)) presentCount++;
      });
    }

    return ((presentCount / total) * 100).toFixed(1);
  };

  const getPresentCount = (studentId) => {
    let presentCount = 0;
    if (isSenior) {
      classSessions.forEach((s) => {
        if (hasAttendance(s.date, studentId)) presentCount++;
      });
    } else {
      attendanceDates.forEach((date) => {
        if (hasAttendance(date, studentId)) presentCount++;
      });
    }
    return presentCount;
  };

  const totalColumns = isSenior ? classSessions.length : attendanceDates.length;

  // ---- student picker ----
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

  const addStudent = (student) => {
    if (!selectedStudentIds.includes(student._id)) {
      setSelectedStudentIds([...selectedStudentIds, student._id]);
    }
    setStudentInput("");
    setStudentSuggestions([]);
  };

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

  const removeStudent = (studentId) => {
    setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
  };

  // ---- submit attendance ----
  const handleSubmitAttendance = async (e) => {
    e.preventDefault();

    if (isSenior && !selectedSessionId) {
      setMessage({
        type: "error",
        text: "Please select a class session for this attendance",
      });
      return;
    }
    if (!isSenior && !selectedDate) {
      setMessage({ type: "error", text: "Please select a date" });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one student" });
      return;
    }

    setSubmitting(true);
    try {
      const selectedSession = isSenior
        ? classSessions.find((s) => s._id === selectedSessionId)
        : null;

      const payload = isSenior
        ? {
            sessionId: selectedSessionId,
            date: selectedSession?.date,
            semester: userSemester,
            major: selectedSession?.major,
            studentIds: selectedStudentIds,
          }
        : {
            date: selectedDate,
            semester: userSemester,
            studentIds: selectedStudentIds,
          };

      const response = await fetch("/api/cr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setShowAddModal(false);
        setSelectedStudentIds([]);
        setSelectedDate("");
        setSelectedSessionId("");
        setStudentInput("");
        await fetchAttendanceWithRange(
          userSemester,
          startDate,
          endDate,
          majorFilter,
        );
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

  // ---- delete attendance ----
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
        await fetchAttendanceWithRange(
          userSemester,
          startDate,
          endDate,
          majorFilter,
        );
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  // ---- create session ----
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionDate) {
      setMessage({ type: "error", text: "Please select a date" });
      return;
    }
    if (!sessionMajor) {
      setMessage({ type: "error", text: "Please select a major" });
      return;
    }

    setSessionSubmitting(true);
    try {
      const response = await fetch("/api/cr/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sessionDate,
          semester: userSemester,
          major: sessionMajor,
          status: "held",
          note: sessionNote.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Class session created" });
        setShowSessionModal(false);
        setSessionDate("");
        setSessionMajor("");
        setSessionNote("");
        await fetchAttendanceWithRange(
          userSemester,
          startDate,
          endDate,
          majorFilter,
        );
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setSessionSubmitting(false);
    }
  };

  // ---- delete session ----
  const handleDeleteSession = async (sessionId, date) => {
    if (
      !confirm(
        `Delete the ENTIRE session for ${formatToDDMMYYYY(
          date,
        )}? This removes all attendance recorded for that day.`,
      )
    )
      return;

    try {
      const response = await fetch(`/api/cr/class-sessions?id=${sessionId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        await fetchAttendanceWithRange(
          userSemester,
          startDate,
          endDate,
          majorFilter,
        );
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  // ---- attendance lookups ----
  const hasAttendance = (date, studentId) => {
    const records = attendanceData[date];
    if (!records) return false;
    return records.some(
      (record) =>
        record.studentId?._id === studentId || record.studentId === studentId,
    );
  };

  const getAttendanceRecord = (date, studentId) => {
    const records = attendanceData[date];
    if (!records) return null;
    return records.find(
      (record) =>
        record.studentId?._id === studentId || record.studentId === studentId,
    );
  };

  // When a session is selected in the Mark-Attendance modal, load the students
  // of that session's major so the picker shows the right set.
  const handleSessionSelect = async (sessionId) => {
    setSelectedSessionId(sessionId);
    const sess = classSessions.find((s) => s._id === sessionId);
    if (sess?.major) {
      await fetchStudents(sess.major);
    }
  };

  // ---- print ----
  const handlePrint = () => {
    const printContent = document.getElementById(
      "attendance-print-area",
    ).innerHTML;

    const dateRangeText = `${formatToDDMMYYYY(startDate)} to ${formatToDDMMYYYY(endDate)}`;
    const generatedDate = new Date().toLocaleString();
    const majorLabel = majorFilter
      ? ` · Major: ${majorFilter
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")}`
      : isSenior
        ? " · All Majors"
        : "";
    const sessionModeLabel = isSenior
      ? `Sessions: ${classSessions.length}${majorLabel}`
      : `Classes: ${attendanceDates.length}`;

    const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Report - ${userSemester} Semester</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background: white; }
        
        @media print {
          @page { size: A4 landscape; margin: 0.15cm; }
          .print-hide { display: none !important; visibility: hidden !important; }
          body { padding: 0; margin: 0; font-size: 5pt !important; line-height: 1.1 !important; }
          .whitespace-nowrap { white-space: normal !important; }
          [class*="min-w-"] { min-width: 0 !important; } 
          .overflow-x-auto { overflow: visible !important; }
          
          table { width: 100% !important; max-width: 100% !important; font-size: 5pt !important; table-layout: auto !important; border-collapse: collapse !important; }
          th, td { padding: 1px !important; word-break: break-word !important; white-space: normal !important; border: 0.5px solid #e5e7eb !important; height: auto !important; }
          .px-4, .py-4, .px-2, .py-3 { padding: 1px !important; }
          .print-header { margin-bottom: 5px; text-align: center; }
          .print-header h1 { font-size: 9pt; margin: 0; font-weight: bold; }
          .print-header h2 { font-size: 7pt; margin: 2px 0; }
          .print-header p { font-size: 5pt; margin: 1px 0; }
          svg { width: 7px !important; height: 7px !important; }
          .w-6, .h-6 { width: 9px !important; height: 9px !important; min-width: 9px !important; } 
          .text-\\[10px\\] { font-size: 4pt !important; padding: 0 !important; line-height: 1 !important; } 
          .gap-2 { gap: 1px !important; }
          .flex.items-center { display: inline-flex !important; }
          .sticky, .left-0, .left-\\[100px\\] { position: static !important; }
        }
        
        .print-header { margin-bottom: 10px; text-align: center; }
        .print-header h1 { font-size: 14px; margin: 0; }
        .print-header h2 { font-size: 12px; margin: 2px 0; color: #555; }
        .print-header p { font-size: 10px; margin: 2px 0; color: #777; }
        table { border-collapse: collapse; width: 100%; font-size: 6px; }
        th, td { border: 1px solid #ddd; padding: 1px; text-align: center; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .text-left { text-align: left; }
        .print-footer { margin-top: 5px; font-size: 6px; text-align: center; color: #888; }
        .overflow-x-auto { overflow: visible !important; }
        .whitespace-nowrap { white-space: normal !important; }
        [class*="min-w-"] { min-width: 0 !important; } 
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>ATTENDANCE REPORT</h1>
        <h2>${userSemester} Semester</h2>
        <p>Period: ${dateRangeText}</p>
        <p>${sessionModeLabel}</p>
        <p>Generated on: ${generatedDate}</p>
      </div>
      ${printContent}
      <div class="print-footer">
        <p>This is a system generated report. Valid with digital signature.</p>
      </div>
    </body>
    </html>
  `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    iframe.contentWindow.onload = () => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error("Print failed:", e);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(printHtml);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
            printWindow.onafterprint = () => {
              printWindow.close();
            };
          };
        } else {
          alert(
            "Please allow popups for this site to print, or use your browser's print feature (Ctrl+P / Cmd+P)",
          );
        }
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 py-8 px-2 md:px-6 font-sans text-gray-800">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-200">
                <FiCalendar className="text-3xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                  Attendance Management
                </h1>
                <p className="text-gray-500 font-medium mt-1">
                  {userSemester} Semester Tracking Panel
                  {isSenior && user?.major && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <FiBriefcase size={11} className="capitalize" />
                      {user.major}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button
                onClick={handlePrint}
                disabled={totalColumns === 0}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPrinter className="text-lg" />{" "}
                <span className="hidden sm:inline">Print Report</span>
              </button>

              {isSenior && (
                <button
                  onClick={() => {
                    setSessionDate(getTodayDateForStorage());
                    setSessionMajor(majorFilter || user?.major || "");
                    setSessionNote("");
                    setShowSessionModal(true);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-indigo-200 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 hover:shadow-sm transition-all"
                >
                  <FiCalendar className="text-lg" />
                  New Class Session
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedDate(getTodayDateForStorage());
                  setSelectedStudentIds([]);
                  setSelectedSessionId("");
                  setStudentInput("");
                  setShowAddModal(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-md shadow-emerald-200 transition-all transform hover:-translate-y-0.5"
              >
                <FiPlus className="text-lg" /> Mark Attendance
              </button>
            </div>
          </div>
        </div>

        {/* message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in-down shadow-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "error" ? (
              <FiAlertCircle className="text-xl shrink-0" />
            ) : (
              <FiCheckCircle className="text-xl shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 mb-8 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-sm font-semibold text-gray-700">
              Showing: {userSemester} Semester
              {isSenior && majorFilter
                ? ` · ${majorFilter}`
                : isSenior
                  ? " · All Majors"
                  : ""}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-end w-full xl:w-auto flex-wrap">
            {/* ✅ NEW — Major filter (senior only) */}
            {isSenior && (
              <div className="w-full sm:w-auto">
                <label className="block text-gray-500 mb-1.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <FiBriefcase size={11} /> Major
                </label>
                <select
                  value={majorFilter}
                  onChange={(e) => handleMajorFilterChange(e.target.value)}
                  className="w-full sm:w-48 text-gray-700 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-medium capitalize"
                >
                  {MAJOR_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m
                        .split(" ")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full sm:w-auto">
              <label className="block text-gray-500 mb-1.5 text-xs font-semibold uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-40 text-gray-700 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-gray-500 mb-1.5 text-xs font-semibold uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-40 text-gray-700 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
              <button
                onClick={handleDateRangeChange}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-900 shadow-sm transition-all text-sm"
              >
                Apply
              </button>
              <button
                onClick={handleResetToDefault}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 border border-gray-200 transition-all text-sm"
              >
                Last 30 Days
              </button>
              <button
                onClick={() =>
                  fetchAttendanceWithRange(
                    userSemester,
                    startDate,
                    endDate,
                    majorFilter,
                  )
                }
                className="px-4 py-2.5 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 border border-blue-100 transition-all text-sm flex items-center justify-center shrink-0"
                title="Refresh Data"
              >
                <FiRefreshCw
                  className={loading ? "animate-spin" : ""}
                  size={18}
                />
              </button>
            </div>
          </div>
        </div>

        {startDate && endDate && (
          <div className="mb-4 text-sm font-medium text-gray-500 flex items-center gap-2 flex-wrap">
            <FiCalendar className="text-gray-400" />
            Report timeframe:{" "}
            <span className="text-gray-800">
              {formatToDDMMYYYY(startDate)}
            </span>{" "}
            to{" "}
            <span className="text-gray-800">{formatToDDMMYYYY(endDate)}</span>
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs ml-2">
              {isSenior
                ? `${classSessions.length} sessions tracked`
                : `${attendanceDates.length} days tracked`}
            </span>
          </div>
        )}

        {/* Attendance table */}
        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden mb-8">
          <div id="attendance-print-area">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-500 font-medium">
                  Loading student roster...
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="bg-gray-50 p-6 rounded-full mb-4">
                  <FiUsers className="text-6xl text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium text-lg">
                  No students found for {userSemester} semester
                  {isSenior && majorFilter ? ` (${majorFilter})` : ""}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="left-0 z-20 px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-slate-50 shadow-[1px_0_0_#e5e7eb] min-w-[100px]">
                        College ID
                      </th>
                      <th className="left-[100px] z-20 px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-slate-50 shadow-[1px_0_0_#e5e7eb] min-w-[180px]">
                        Student Name
                      </th>

                      {isSenior
                        ? classSessions.map((session) => (
                            <th
                              key={session._id}
                              className="px-2 py-3 text-center min-w-[80px] border-l border-gray-200/50"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-gray-800 font-bold">
                                  {formatTableDateShort(session.date)}
                                </div>
                                <div className="text-[10px] font-semibold uppercase text-indigo-600 bg-indigo-50 rounded px-1 inline-block capitalize">
                                  {session.major
                                    ? session.major.split(" ")[0]
                                    : "—"}
                                </div>
                                <button
                                  onClick={() =>
                                    handleDeleteSession(
                                      session._id,
                                      session.date,
                                    )
                                  }
                                  className="text-red-400 hover:text-red-600 print-hide mt-0.5"
                                  title="Delete entire session"
                                >
                                  <FiTrash2 size={12} />
                                </button>
                                {session.note && (
                                  <span
                                    className="text-[9px] text-amber-600 italic"
                                    title={session.note}
                                  >
                                    note
                                  </span>
                                )}
                              </div>
                            </th>
                          ))
                        : attendanceDates.map((date) => (
                            <th
                              key={date}
                              className="px-2 py-3 text-center min-w-[65px] border-l border-gray-200/50"
                            >
                              <div className="text-gray-800 font-bold">
                                {formatTableDateShort(date)}
                              </div>
                              <div className="text-[10px] font-semibold uppercase text-emerald-600 mt-0.5 bg-emerald-50 rounded px-1 inline-block">
                                {new Date(date)
                                  .toLocaleDateString("en-GB", {
                                    weekday: "short",
                                  })
                                  .slice(0, 3)}
                              </div>
                            </th>
                          ))}

                      <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 shadow-[-1px_0_0_#e5e7eb] bg-slate-50 min-w-[80px]">
                        P / T
                      </th>
                      <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-slate-50 min-w-[80px]">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const presentCount = getPresentCount(student._id);
                      const percentage = parseFloat(
                        getAttendancePercentage(student._id),
                      );
                      const isCR = student.isCR || student.role === "cr";

                      return (
                        <tr
                          key={student._id}
                          className={`group transition-colors ${
                            isCR
                              ? "bg-blue-50/30 hover:bg-blue-50/60"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td
                            className={`left-0 z-10 px-4 py-3 font-mono text-xs text-gray-600 shadow-[1px_0_0_#e5e7eb] transition-colors ${
                              isCR
                                ? "bg-[#f8fbff] group-hover:bg-[#f0f6ff]"
                                : "bg-white group-hover:bg-slate-50"
                            }`}
                          >
                            {student.collegeId}
                          </td>
                          <td
                            className={`left-[100px] z-10 px-4 py-3 shadow-[1px_0_0_#e5e7eb] transition-colors ${
                              isCR
                                ? "bg-[#f8fbff] group-hover:bg-[#f0f6ff]"
                                : "bg-white group-hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800 truncate max-w-[130px]">
                                {student.name}
                              </span>
                              {isCR && (
                                <span className="text-[9px] font-bold tracking-wider bg-blue-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                                  CR
                                </span>
                              )}
                              {isSenior && student.major && (
                                <span className="print-hide text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded capitalize">
                                  {student.major.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          </td>

                          {isSenior
                            ? classSessions.map((session) => {
                                const hasRecord = hasAttendance(
                                  session.date,
                                  student._id,
                                );
                                const record = getAttendanceRecord(
                                  session.date,
                                  student._id,
                                );
                                // ✅ Only show mark for students whose major
                                //   matches the session (otherwise em-dash)
                                const matchesMajor =
                                  !session.major ||
                                  session.major === student.major;
                                return (
                                  <td
                                    key={session._id}
                                    className={`px-2 py-3 text-center border-l border-gray-100/50 transition-colors ${
                                      hasRecord ? "bg-green-50/30" : ""
                                    }`}
                                  >
                                    {hasRecord ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                          <TiTick className="text-lg" />
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleDeleteAttendance(
                                              record?._id,
                                              session.date,
                                              student.name,
                                            )
                                          }
                                          className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors print-hide cursor-pointer shadow-sm border border-red-100 flex items-center justify-center"
                                          title="Remove this attendance"
                                        >
                                          <FiTrash2 size={14} />
                                        </button>
                                      </div>
                                    ) : matchesMajor ? (
                                      <span className="text-gray-300 font-bold">
                                        —
                                      </span>
                                    ) : (
                                      <span className="text-gray-200 text-[9px]">
                                        n/a
                                      </span>
                                    )}
                                  </td>
                                );
                              })
                            : attendanceDates.map((date) => {
                                const hasRecord = hasAttendance(
                                  date,
                                  student._id,
                                );
                                const record = getAttendanceRecord(
                                  date,
                                  student._id,
                                );
                                return (
                                  <td
                                    key={date}
                                    className={`px-2 py-3 text-center border-l border-gray-100/50 transition-colors ${
                                      hasRecord ? "bg-green-50/30" : ""
                                    }`}
                                  >
                                    {hasRecord ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                          <TiTick className="text-lg" />
                                        </div>
                                        <button
                                          onClick={() =>
                                            handleDeleteAttendance(
                                              record?._id,
                                              date,
                                              student.name,
                                            )
                                          }
                                          className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors print-hide cursor-pointer shadow-sm border border-red-100 flex items-center justify-center"
                                          title="Remove attendance"
                                        >
                                          <FiTrash2 size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-300 font-bold">
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                          <td className="px-4 py-3 text-center font-bold text-gray-700 bg-slate-50/50 border-l border-gray-100 shadow-[-1px_0_0_#e5e7eb]">
                            <span className="text-emerald-600">
                              {presentCount}
                            </span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span>{totalColumns}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-slate-50/50">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                                percentage >= 75
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : percentage >= 60
                                    ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                    : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-gray-200">
                    <tr>
                      <td
                        colSpan="2"
                        className="sticky left-0 z-10 px-4 py-4 text-xs font-bold text-gray-700 bg-slate-50 shadow-[1px_0_0_#e5e7eb]"
                      >
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-emerald-600" />
                          Total {isSenior
                            ? "Sessions"
                            : "Recorded Classes"}: {totalColumns}
                        </div>
                      </td>
                      <td
                        colSpan={totalColumns + 2}
                        className="px-4 py-4 text-xs text-gray-500 font-medium text-right"
                      >
                        <span className="inline-flex items-center gap-1 mx-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center text-[8px] text-emerald-600">
                            <TiTick />
                          </div>{" "}
                          Present
                        </span>
                        <span className="inline-flex items-center gap-1 mx-2">
                          <span className="text-gray-300 font-bold">—</span>{" "}
                          Absent
                        </span>
                        <span className="inline-flex items-center gap-1 mx-2">
                          <FiTrash2 className="text-red-400" size={10} /> Delete
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* summary cards */}
        {students.length > 0 && totalColumns > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="bg-blue-50 p-4 rounded-xl">
                <FiUsers className="text-2xl text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">
                  Total Roster
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {students.length}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="bg-emerald-50 p-4 rounded-xl">
                <FiCalendar className="text-2xl text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">
                  {isSenior ? "Sessions Recorded" : "Classes Recorded"}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalColumns}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="bg-purple-50 p-4 rounded-xl">
                <FaUserCheck className="text-2xl text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">
                  Average Attendance
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {(
                      students.reduce(
                        (acc, s) =>
                          acc + parseFloat(getAttendancePercentage(s._id)),
                        0,
                      ) / students.length
                    ).toFixed(1)}
                  </p>
                  <span className="text-lg font-bold text-gray-500">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Session Modal (senior only) */}
        {showSessionModal && isSenior && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100">
              <div className="bg-gray-50/50 flex justify-between items-center px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <FiCalendar className="text-indigo-600 text-xl" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    New Class Session
                  </h2>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX size={22} />
                </button>
              </div>

              <form
                onSubmit={handleCreateSession}
                className="p-6 space-y-5 flex-1"
              >
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                    max={getTodayDateForStorage()}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults to today. Cannot be a future date.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                    <FiBriefcase className="text-indigo-500" /> Major *
                  </label>
                  <select
                    value={sessionMajor}
                    onChange={(e) => setSessionMajor(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700 font-medium capitalize"
                  >
                    <option value="">— Select a major —</option>
                    {MAJOR_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m
                          .split(" ")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can create a session for any major in your semester.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                    rows={3}
                    maxLength={200}
                    placeholder='e.g., "Guest lecture", "No students came" etc.'
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    className="w-1/3 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      sessionSubmitting || !sessionDate || !sessionMajor
                    }
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-indigo-800 shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {sessionSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiPlus /> Create Session
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Attendance Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 transform transition-all">
              <div className="bg-gray-50/50 flex justify-between items-center px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <FiPlus className="text-emerald-600 text-xl" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Log New Attendance
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX size={22} />
                </button>
              </div>

              <form
                onSubmit={handleSubmitAttendance}
                className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6"
              >
                {isSenior ? (
                  <div>
                    <label className="block text-gray-800 font-bold mb-2">
                      Select Class Session *
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      You can mark attendance for any major in your semester.
                    </p>
                    {classSessions.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
                        <FiInfo className="text-lg shrink-0 mt-0.5" />
                        <div>
                          No class sessions found in this date range. Close this
                          dialog and click{" "}
                          <strong>&ldquo;New Class Session&rdquo;</strong>{" "}
                          first.
                        </div>
                      </div>
                    ) : (
                      <select
                        value={selectedSessionId}
                        onChange={(e) => handleSessionSelect(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-700 font-medium"
                      >
                        <option value="">— Select a session —</option>
                        {classSessions.map((s) => (
                          <option key={s._id} value={s._id}>
                            {formatToDDMMYYYY(s.date)} ·{" "}
                            {s.major
                              ? s.major
                                  .split(" ")
                                  .map(
                                    (w) =>
                                      w.charAt(0).toUpperCase() + w.slice(1),
                                  )
                                  .join(" ")
                              : "—"}{" "}
                            (
                            {new Date(s.date).toLocaleDateString("en-GB", {
                              weekday: "short",
                            })}
                            ){s.note ? ` — ${s.note}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <FiCalendar className="text-blue-500 text-xl shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm">
                        Recording for Today
                      </h4>
                      <p className="text-blue-700 text-xs mt-1">
                        Date automatically set to{" "}
                        <strong>{formatToDDMMYYYY(selectedDate)}</strong>. A
                        class session will be auto-created for this date.
                      </p>
                    </div>
                  </div>
                )}

                {/* bulk add */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <label className="block text-gray-800 font-bold mb-2">
                    Bulk Add by College ID
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Paste multiple IDs separated by commas or spaces.
                  </p>
                  <div className="block md:flex gap-3">
                    <input
                      type="text"
                      id="collegeIdsInput"
                      placeholder="e.g., 521017, 521018..."
                      className="flex-1 w-full md:w-auto text-gray-700 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono text-sm outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input =
                            document.getElementById("collegeIdsInput");
                          if (input && input.value) {
                            addMultipleStudents(input.value);
                            input.value = "";
                          }
                        }
                      }}
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
                      className="mt-2 w-full md:w-auto md:mt-0 px-6 py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* search */}
                <div>
                  <label className="block text-gray-800 font-bold mb-3">
                    Search Individual Student
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={studentInput}
                      onChange={(e) => handleStudentSearch(e.target.value)}
                      placeholder="Type name or college ID..."
                      className="w-full text-gray-700 pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    />
                    {studentSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-2 shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                        {studentSuggestions.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => addStudent(student)}
                            className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex justify-between items-center border-b border-gray-50 last:border-b-0 transition-colors"
                          >
                            <span className="font-semibold text-gray-700">
                              {student.name}
                            </span>
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {student.collegeId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* selected */}
                {selectedStudentIds.length > 0 && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                      <label className="text-gray-800 font-bold flex items-center gap-2">
                        Marking Present
                        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs">
                          {selectedStudentIds.length} students
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                      {selectedStudentIds.map((studentId) => {
                        const student = students.find(
                          (s) => s._id === studentId,
                        );
                        if (!student) return null;
                        return (
                          <div
                            key={studentId}
                            className="flex justify-between items-center p-3 bg-white mb-1 rounded-lg border border-gray-100 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm">
                                  {student.name}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {student.collegeId}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStudent(studentId)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove"
                            >
                              <FiX size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* footer */}
                <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6 sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-1/3 px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      selectedStudentIds.length === 0 ||
                      (isSenior ? !selectedSessionId : !selectedDate) ||
                      (isSenior && classSessions.length === 0)
                    }
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiUserPlus className="text-lg" />
                        Submit {selectedStudentIds.length} Records
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CRAttendancePage;
