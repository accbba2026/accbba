"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiCalendar,
  FiBookOpen,
  FiUsers,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa";
import Link from "next/link";

const StudentAssignment = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssignments, setExpandedAssignments] = useState({});
  const [submissionStatusMap, setSubmissionStatusMap] = useState({});
  const [checkingSubmission, setCheckingSubmission] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const studentSemester = user?.semester || "1st";

  // Course color mapping - consistent colors for each course
  const courseColorMap = useMemo(() => {
    const colorMap = new Map();
    const courseColors = [
      {
        bg: "bg-gradient-to-br from-blue-50 to-blue-100",
        border: "border-blue-200",
        hover: "hover:shadow-blue-200",
        badge: "bg-blue-100 text-blue-700",
        icon: "text-blue-600",
      },
      {
        bg: "bg-gradient-to-br from-green-50 to-green-100",
        border: "border-green-200",
        hover: "hover:shadow-green-200",
        badge: "bg-green-100 text-green-700",
        icon: "text-green-600",
      },
      {
        bg: "bg-gradient-to-br from-purple-50 to-purple-100",
        border: "border-purple-200",
        hover: "hover:shadow-purple-200",
        badge: "bg-purple-100 text-purple-700",
        icon: "text-purple-600",
      },
      {
        bg: "bg-gradient-to-br from-orange-50 to-orange-100",
        border: "border-orange-200",
        hover: "hover:shadow-orange-200",
        badge: "bg-orange-100 text-orange-700",
        icon: "text-orange-600",
      },
      {
        bg: "bg-gradient-to-br from-pink-50 to-pink-100",
        border: "border-pink-200",
        hover: "hover:shadow-pink-200",
        badge: "bg-pink-100 text-pink-700",
        icon: "text-pink-600",
      },
      {
        bg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
        border: "border-indigo-200",
        hover: "hover:shadow-indigo-200",
        badge: "bg-indigo-100 text-indigo-700",
        icon: "text-indigo-600",
      },
      {
        bg: "bg-gradient-to-br from-teal-50 to-teal-100",
        border: "border-teal-200",
        hover: "hover:shadow-teal-200",
        badge: "bg-teal-100 text-teal-700",
        icon: "text-teal-600",
      },
      {
        bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
        border: "border-yellow-200",
        hover: "hover:shadow-yellow-200",
        badge: "bg-yellow-100 text-yellow-700",
        icon: "text-yellow-600",
      },
      {
        bg: "bg-gradient-to-br from-red-50 to-red-100",
        border: "border-red-200",
        hover: "hover:shadow-red-200",
        badge: "bg-red-100 text-red-700",
        icon: "text-red-600",
      },
      {
        bg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
        border: "border-cyan-200",
        hover: "hover:shadow-cyan-200",
        badge: "bg-cyan-100 text-cyan-700",
        icon: "text-cyan-600",
      },
    ];

    let colorIndex = 0;
    assignments.forEach((assignment) => {
      const courseId = assignment.course?._id;
      if (courseId && !colorMap.has(courseId)) {
        colorMap.set(courseId, courseColors[colorIndex % courseColors.length]);
        colorIndex++;
      }
    });

    return colorMap;
  }, [assignments]);

  // Fetch assignments for student's semester
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/student/assignments?semester=${studentSemester}`,
      );
      if (!response.ok) throw new Error("Failed to fetch assignments");

      const data = await response.json();
      if (data.success) {
        setAssignments(data.data);
        await checkAllSubmissionsStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check submission status for a single assignment
  const checkSubmissionStatus = async (assignmentId) => {
    setCheckingSubmission((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await fetch(
        `/api/student/assignment-submitted?assignmentId=${assignmentId}`,
      );
      if (!response.ok) throw new Error("Failed to check submission");

      const data = await response.json();
      if (data.success) {
        setSubmissionStatusMap((prev) => ({
          ...prev,
          [assignmentId]: data.data,
        }));
      }
    } catch (error) {
      console.error("Error checking submission:", error);
    } finally {
      setCheckingSubmission((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  // Check submission status for all assignments
  const checkAllSubmissionsStatus = async (assignmentsList) => {
    for (const assignment of assignmentsList) {
      await checkSubmissionStatus(assignment._id);
    }
  };

  // Fetch all submissions for an assignment (for the expanded view)
  const fetchAllSubmissions = async (assignmentId) => {
    //eslint-disable-next-line
    if (!window.allSubmissions) window.allSubmissions = {};

    if (window.allSubmissions[assignmentId]) return;

    setExpandedAssignments((prev) => ({ ...prev, [assignmentId]: true }));

    try {
      const response = await fetch(
        `/api/student/assignments/submissions?assignmentId=${assignmentId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch submissions");

      const data = await response.json();
      if (data.success) {
        //eslint-disable-next-line
        window.allSubmissions[assignmentId] = data.data;
        // Force re-render
        setExpandedAssignments((prev) => ({ ...prev }));
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  // Toggle assignment expansion
  const toggleAssignment = async (assignmentId) => {
    const isExpanded = expandedAssignments[assignmentId];

    if (!isExpanded) {
      await fetchAllSubmissions(assignmentId);
    } else {
      setExpandedAssignments((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  useEffect(() => {
    if (user) {
      //eslint-disable-next-line
      fetchAssignments();
    }
    //eslint-disable-next-line
  }, [user]);

  // Get submission status text from the map
  const getSubmissionStatusText = (assignmentId) => {
    const statusData = submissionStatusMap[assignmentId];
    if (!statusData || !statusData.submitted) {
      return { text: "Not Submitted", color: "red", icon: "❌" };
    }

    if (statusData.status === "On Time") {
      return { text: "Submitted", color: "green", icon: "✅" };
    } else {
      return { text: "Late", color: "orange", icon: "⚠️" };
    }
  };

  // Get submission deadline status
  const getDeadlineStatus = (submissionDate) => {
    if (!submissionDate) return { text: "No Date", color: "gray" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subDate = new Date(submissionDate);
    subDate.setHours(0, 0, 0, 0);

    const diffTime = subDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { text: "Submit Day", color: "orange" };
    } else if (diffDays === 1) {
      return { text: "1 Day Left", color: "green" };
    } else if (diffDays === 2) {
      return { text: "2 Days Left", color: "green" };
    } else if (diffDays > 2) {
      return { text: `${diffDays} Days Left`, color: "green" };
    } else {
      return { text: "Expired", color: "red" };
    }
  };

  const formatDateLong = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      weekday: "long",
    });
  };

  const formatDateShort = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get unique courses for filter
  const filterCourses = [
    ...new Map(
      assignments.map((a) => [
        a.course?._id,
        {
          id: a.course?._id,
          name: a.course?.courseName,
          code: a.course?.courseCode,
        },
      ]),
    ).values(),
  ];

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.course?.courseName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesCourse =
      selectedCourse === "all" || assignment.course?._id === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  if (!user || user?.role === "faculty" || user?.role === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                  <FiFileText className="text-2xl text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    My Assignments
                  </h1>
                  <p className="text-gray-600 mt-1">
                    View and track your assignment submissions for{" "}
                    <span className="font-semibold text-blue-600">
                      {studentSemester} Semester
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-blue-700">
                    Total: {filteredAssignments.length} Assignments
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section - Collapsible */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          {/* Filter Header - Clickable to toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">
                Filter Assignments
              </h3>
              {!isFilterOpen && (
                <span className="text-xs text-gray-400 ml-2">
                  (
                  {searchTerm || selectedCourse !== "all"
                    ? "Active filters"
                    : "No filters applied"}
                  )
                </span>
              )}
            </div>
            {isFilterOpen ? (
              <FiChevronUp size={20} className="text-gray-500" />
            ) : (
              <FiChevronDown size={20} className="text-gray-500" />
            )}
          </button>

          {/* Filter Content - Collapsible */}
          {isFilterOpen && (
            <div className="p-5 pt-0 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiSearch className="text-gray-400" />
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by assignment name or course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-gray-600 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiBookOpen className="text-gray-400" />
                    Course
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full text-gray-600 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  >
                    <option value="all">All Courses</option>
                    {filterCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading assignments...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <FiFileText className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No assignments found for your semester
              </p>
              {(searchTerm || selectedCourse !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCourse("all");
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const isExpanded = expandedAssignments[assignment._id];
              const submissionStatus = getSubmissionStatusText(assignment._id);
              const isChecking = checkingSubmission[assignment._id];
              const deadlineStatus = getDeadlineStatus(
                assignment.submissionDate,
              );
              const courseStyle = courseColorMap.get(
                assignment.course?._id,
              ) || {
                bg: "bg-gradient-to-br from-gray-50 to-gray-100",
                border: "border-gray-200",
                hover: "hover:shadow-gray-100",
                badge: "bg-gray-100 text-gray-700",
                icon: "text-gray-600",
              };

              const allSubmissions =
                window.allSubmissions?.[assignment._id] || [];

              return (
                <div
                  key={assignment._id}
                  className={`${courseStyle.bg} rounded-xl shadow-sm border ${courseStyle.border} overflow-hidden hover:shadow-xl transition-all duration-300 ${courseStyle.hover}`}
                >
                  <div className="p-6">
                    {/* Header with Full Assignment Name */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <Link
                            href={`/student/assignments/view/${assignment._id}`}
                            className="flex-shrink-0"
                          >
                            <FaFilePdf className="text-red-500 text-2xl hover:text-red-600 transition-colors" />
                          </Link>
                          <div className="flex-1">
                            {/* Full assignment name displayed prominently */}
                            <Link
                              href={`/student/assignments/view/${assignment._id}`}
                              className="group"
                            >
                              <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors break-words">
                                {assignment.title}
                              </h3>
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-sm text-gray-600">
                                {assignment.course?.courseName}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-sm font-mono text-gray-500">
                                {assignment.course?.courseCode}
                              </span>
                              {assignment.chapter && (
                                <>
                                  <span className="text-xs text-gray-400">
                                    •
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${courseStyle.badge}`}
                                  >
                                    Chapter {assignment.chapter}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isChecking ? (
                          <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                            Checking...
                          </span>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              submissionStatus.color === "green"
                                ? "bg-green-100 text-green-700"
                                : submissionStatus.color === "orange"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {submissionStatus.icon} {submissionStatus.text}
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            deadlineStatus.color === "orange"
                              ? "bg-orange-100 text-orange-700"
                              : deadlineStatus.color === "green"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {deadlineStatus.text}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {assignment.description && (
                      <div className="mb-4">
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {assignment.description}
                        </p>
                      </div>
                    )}

                    {/* Submission Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 p-3 bg-white/50 rounded-lg">
                      <FiCalendar className="flex-shrink-0 text-blue-500" />
                      <span className="font-medium">Submission Deadline:</span>
                      <span>{formatDateLong(assignment.submissionDate)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200">
                      {assignment.pdfUrl && (
                        <Link
                          href={`/student/assignments/view/${assignment._id}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          <FiEye size={16} /> View Assignment
                        </Link>
                      )}
                      <button
                        onClick={() => toggleAssignment(assignment._id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                      >
                        {isExpanded ? (
                          <FiChevronUp size={16} />
                        ) : (
                          <FiChevronDown size={16} />
                        )}
                        {isExpanded
                          ? "Hide Submissions"
                          : "View All Submissions"}
                        {!isExpanded && allSubmissions.length > 0 && (
                          <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                            {allSubmissions.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Submissions List - Expandable */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <FiUsers className="text-green-600" />
                          <h4 className="font-semibold text-gray-900">
                            All Student Submissions
                          </h4>
                          <span className="text-xs text-gray-500">
                            ({allSubmissions.length} total)
                          </span>
                        </div>
                        {allSubmissions.length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 rounded-lg">
                            <p className="text-gray-500 text-sm">
                              No submissions yet
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                  <th className="px-3 py-2 text-left text-gray-800 font-semibold">
                                    #
                                  </th>
                                  <th className="px-3 py-2 text-left text-gray-800 font-semibold">
                                    Student Name
                                  </th>
                                  <th className="px-3 py-2 text-left text-gray-800 font-semibold">
                                    Student ID
                                  </th>
                                  <th className="px-3 py-2 text-left text-gray-800 font-semibold">
                                    Submission Date
                                  </th>
                                  <th className="px-3 py-2 text-left text-gray-800 font-semibold">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {allSubmissions.map((sub, index) => (
                                  <tr
                                    key={sub._id}
                                    className="hover:bg-gray-50 transition"
                                  >
                                    <td className="px-3 py-2 text-gray-600">
                                      {index + 1}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-gray-900">
                                      {sub.studentName || sub.student?.name}
                                      {String(
                                        sub.student?._id || sub.student,
                                      ) === String(user?._id) && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                          You
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                                      {sub.studentCollegeId ||
                                        sub.student?.collegeId}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                      {sub.submittedAt
                                        ? formatDateShort(sub.submittedAt)
                                        : "N/A"}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                          sub.status === "onTime"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {sub.status === "onTime"
                                          ? "On Time"
                                          : "Late"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssignment;
