// app/components/home/MyAttendance.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiAlertCircle,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

const MyAttendance = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">
            Please login to view attendance
          </p>
        </div>
      </div>
    );
  }

  // Update this line (around line 25):
  if (user.role !== "student" && user.role !== "cr") {
    return null;
  }

  const studentSemester = user?.semester || "1st";
  const studentId = user?._id || user?.id;
  const studentName = user?.name;
  const studentCollegeId = user?.collegeId;

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

  // Update the fetchAttendance function in MyAttendance.jsx
  const fetchAttendance = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Remove date range parameters - just fetch by studentId and semester
      const url = `/api/student/attendance?studentId=${studentId}&semester=${studentSemester}`;

      console.log("Fetching attendance from:", url);
      const response = await fetch(url);
      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        setAttendanceData(data.data || {});
        const sortedDates = [...(data.dates || [])].sort(
          (a, b) => new Date(a) - new Date(b),
        );
        setAttendanceDates(sortedDates);
        console.log(`Loaded ${sortedDates.length} class dates`);
      } else {
        setError(data.message || "Failed to load attendance data");
        setAttendanceData({});
        setAttendanceDates([]);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setError("Network error. Please try again later.");
      setAttendanceData({});
      setAttendanceDates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      user &&
      (user._id || user.id) &&
      (user.role === "student" || user.role === "cr")
    ) {
      fetchAttendance();
    } else {
      setLoading(false);
    }
  }, [user]);

  const isPresent = (date) => {
    const records = attendanceData[date];
    if (!records || records.length === 0) return false;
    return records.some(
      (record) =>
        record.studentId?._id === studentId || record.studentId === studentId,
    );
  };

  const getAttendancePercentage = () => {
    if (attendanceDates.length === 0) return 0;
    let presentCount = 0;
    attendanceDates.forEach((date) => {
      if (isPresent(date)) {
        presentCount++;
      }
    });
    return ((presentCount / attendanceDates.length) * 100).toFixed(1);
  };

  const getPresentCount = () => {
    let presentCount = 0;
    attendanceDates.forEach((date) => {
      if (isPresent(date)) {
        presentCount++;
      }
    });
    return presentCount;
  };

  const percentage = parseFloat(getAttendancePercentage());
  const presentCount = getPresentCount();
  const totalClasses = attendanceDates.length;

  const getAttendanceMessage = () => {
    if (totalClasses === 0) {
      return {
        text: "No attendance records found yet. Please contact your CR to mark your attendance.",
        color: "text-gray-700",
        bg: "bg-gray-50",
        border: "border-gray-200",
        icon: "📊",
        suggestion:
          "If you have attended classes, please ask your CR to mark your attendance.",
      };
    } else if (percentage === 0) {
      return {
        text: "You have 0% attendance! You will get 0 attendance mark!",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "❗",
        suggestion:
          "Start attending classes immediately and ask your CR to mark your attendance to improve your percentage.",
      };
    } else if (percentage >= 80) {
      return {
        text: "Excellent! Keep up the great attendance! 🎉",
        color: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
        icon: "🎉",
        suggestion: null,
      };
    } else if (percentage >= 60) {
      return {
        text: "Good! Maintain this consistency to keep your marks safe.",
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "👍",
        suggestion: null,
      };
    } else if (percentage >= 50) {
      return {
        text: "Be attentive! Your attendance is at risk. Try to improve.",
        color: "text-yellow-700",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        icon: "⚠️",
        suggestion:
          "Attend more classes regularly to maintain good attendance.",
      };
    } else if (percentage >= 20) {
      return {
        text: "Warning! Your attendance mark will be affected. Please attend more classes regularly.",
        color: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
        icon: "🔴",
        suggestion: "You need to improve your attendance immediately!",
      };
    } else {
      return {
        text: "Critical! Your attendance is very low. You may face consequences. Please attend classes immediately!",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "❗",
        suggestion: "Contact your CR or Faculty for guidance.",
      };
    }
  };

  const message = getAttendanceMessage();

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDayName = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">
            Loading attendance...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="text-center py-6">
          <FiAlertCircle className="text-3xl text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchAttendance}
            className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-1 mx-auto"
          >
            <FiRefreshCw size={12} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div classNameme="min-h-screen bg-gradient-to-br bg-white">
      <div className="container bg-white rounded-2xl mb-10 mx-auto px-4 py-8 max-w-7xl ">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 rounded-xl py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-xl text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">My Attendance</h2>
                <p className="text-blue-100 text-xs">
                  {studentSemester} Semester
                </p>
                <p className="text-blue-100 text-[10px] mt-0.5">
                  ID: {studentCollegeId || "N/A"}
                </p>
              </div>
            </div>
            <button
              onClick={fetchAttendance}
              className="text-white/80 hover:text-white transition p-1"
              title="Refresh"
            >
              <FiRefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="p-4">
          {/* Percentage Circle */}
          <div className="flex flex-row items-center justify-between gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-200 stroke-current"
                    strokeWidth="8"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className={`stroke-current ${
                      percentage >= 75
                        ? "text-green-500"
                        : percentage >= 60
                          ? "text-blue-500"
                          : percentage >= 50
                            ? "text-yellow-500"
                            : percentage >= 20
                              ? "text-orange-500"
                              : "text-red-500"
                    }`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    r="42"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                    transform="rotate(-90 50 50)"
                  />
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-lg font-bold fill-current text-gray-800"
                  >
                    {percentage}%
                  </text>
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">Present</p>
                  <p className="text-lg font-bold text-green-600">
                    {presentCount}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">Absent</p>
                  <p className="text-lg font-bold text-red-600">
                    {totalClasses - presentCount}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500">Total Classes</p>
                <p className="text-base font-bold text-gray-700">
                  {totalClasses}
                </p>
              </div>
            </div>
          </div>

          {/* Message Card */}
          <div
            className={`${message.bg} border ${message.border} rounded-lg p-2 mb-3`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{message.icon}</span>
              <p className={`${message.color} text-xs font-medium flex-1`}>
                {message.text}
              </p>
            </div>
            {message.suggestion && (
              <p className="text-xs text-gray-500 mt-1 pl-7">
                💡 {message.suggestion}
              </p>
            )}
          </div>

          {/* Attendance Details - Collapsible */}
          {totalClasses > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FiTrendingUp className="text-blue-500" />
                  Attendance Details ({totalClasses} days)
                </span>
                {showDetails ? (
                  <FiChevronUp className="text-gray-500" size={16} />
                ) : (
                  <FiChevronDown className="text-gray-500" size={16} />
                )}
              </button>

              {showDetails && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-gray-600">
                          #
                        </th>
                        <th className="px-2 py-1.5 text-left text-gray-600">
                          Date
                        </th>
                        <th className="px-2 py-1.5 text-left text-gray-600">
                          Day
                        </th>
                        <th className="px-2 py-1.5 text-left text-gray-600">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendanceDates.map((date, index) => {
                        const present = isPresent(date);
                        return (
                          <tr
                            key={date}
                            className="hover:bg-gray-50 transition"
                          >
                            <td className="px-2 py-1.5 text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-2 py-1.5 font-medium text-gray-700">
                              {formatDate(date)}
                            </td>
                            <td className="px-2 py-1.5 text-gray-500">
                              {getDayName(date)}
                            </td>
                            <td className="px-2 py-1.5">
                              {present ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                  <FiCheckCircle size={10} /> Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                                  <FiXCircle size={10} /> Absent
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
