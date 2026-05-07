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

  const studentSemester = user?.semester || "1st";

  // Course color mapping - consistent colors for each course
  const courseColorMap = useMemo(() => {
    const colorMap = new Map();
    const courseColors = [
      {
        bg: "bg-gradient-to-br from-blue-50 to-blue-100",
        border: "border-blue-200",
        hover: "hover:shadow-blue-200",
        badge: "bg-blue-100 text-blue-700"
      },
      {
        bg: "bg-gradient-to-br from-green-50 to-green-100",
        border: "border-green-200",
        hover: "hover:shadow-green-200",
        badge: "bg-green-100 text-green-700"
      },
      {
        bg: "bg-gradient-to-br from-purple-50 to-purple-100",
        border: "border-purple-200",
        hover: "hover:shadow-purple-200",
        badge: "bg-purple-100 text-purple-700"
      },
      {
        bg: "bg-gradient-to-br from-orange-50 to-orange-100",
        border: "border-orange-200",
        hover: "hover:shadow-orange-200",
        badge: "bg-orange-100 text-orange-700"
      },
      {
        bg: "bg-gradient-to-br from-pink-50 to-pink-100",
        border: "border-pink-200",
        hover: "hover:shadow-pink-200",
        badge: "bg-pink-100 text-pink-700"
      },
      {
        bg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
        border: "border-indigo-200",
        hover: "hover:shadow-indigo-200",
        badge: "bg-indigo-100 text-indigo-700"
      },
      {
        bg: "bg-gradient-to-br from-teal-50 to-teal-100",
        border: "border-teal-200",
        hover: "hover:shadow-teal-200",
        badge: "bg-teal-100 text-teal-700"
      },
      {
        bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
        border: "border-yellow-200",
        hover: "hover:shadow-yellow-200",
        badge: "bg-yellow-100 text-yellow-700"
      },
      {
        bg: "bg-gradient-to-br from-red-50 to-red-100",
        border: "border-red-200",
        hover: "hover:shadow-red-200",
        badge: "bg-red-100 text-red-700"
      },
      {
        bg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
        border: "border-cyan-200",
        hover: "hover:shadow-cyan-200",
        badge: "bg-cyan-100 text-cyan-700"
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
      const response = await fetch(`/api/student/assignments?semester=${studentSemester}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");

      const data = await response.json();
      if (data.success) {
        setAssignments(data.data);
        // After getting assignments, check submission status for each
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
    setCheckingSubmission(prev => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await fetch(`/api/student/assignment-submitted?assignmentId=${assignmentId}`);
      if (!response.ok) throw new Error("Failed to check submission");
      
      const data = await response.json();
      if (data.success) {
        setSubmissionStatusMap(prev => ({
          ...prev,
          [assignmentId]: data.data
        }));
      }
    } catch (error) {
      console.error("Error checking submission:", error);
    } finally {
      setCheckingSubmission(prev => ({ ...prev, [assignmentId]: false }));
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
    // This is for fetching ALL student submissions when expanding
    // You can keep your existing fetchSubmissionsForAssignment function
    //eslint-disable-next-line
    if (!window.allSubmissions) window.allSubmissions = {};
    
    if (window.allSubmissions[assignmentId]) return;
    
    setExpandedAssignments(prev => ({ ...prev, [assignmentId]: true }));
    
    try {
      const response = await fetch(`/api/student/assignments/submissions?assignmentId=${assignmentId}`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      
      const data = await response.json();
      if (data.success) {
        //eslint-disable-next-line
        window.allSubmissions[assignmentId] = data.data;
        // Force re-render
        setExpandedAssignments(prev => ({ ...prev }));
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
      setExpandedAssignments(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  useEffect(() => {
    if (user) {
      //eslint-disable-next-line
      fetchAssignments();
    }
  }, [user]);

  // Get submission status text from the map
  const getSubmissionStatusText = (assignmentId) => {
    const statusData = submissionStatusMap[assignmentId];

    console.log(submissionStatusMap)
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
      ])
    ).values(),
  ];

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.course?.courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse =
      selectedCourse === "all" || assignment.course?._id === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="mt-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FiFileText className="text-2xl text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
        </div>
        <p className="text-gray-600 ml-10">
          View and track your assignment submissions for {studentSemester} Semester
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-medium">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by title or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-medium">
              Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
            <FiFileText className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No assignments found for your semester</p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const isExpanded = expandedAssignments[assignment._id];
            const submissionStatus = getSubmissionStatusText(assignment._id);
            const isChecking = checkingSubmission[assignment._id];
            const deadlineStatus = getDeadlineStatus(assignment.submissionDate);
            const courseStyle = courseColorMap.get(assignment.course?._id) || {
              bg: "bg-gradient-to-br from-gray-50 to-gray-100",
              border: "border-gray-200",
              hover: "hover:shadow-gray-100",
              badge: "bg-gray-100 text-gray-700"
            };
            
            const allSubmissions = window.allSubmissions?.[assignment._id] || [];

            return (
              <div
                key={assignment._id}
                className={`${courseStyle.bg} rounded-xl shadow-sm border ${courseStyle.border} overflow-hidden hover:shadow-lg transition-all duration-300 ${courseStyle.hover}`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 flex-1">
                      <Link
                        href={`/student/assignments/view/${assignment._id}`}
                        className="flex-shrink-0 mt-1"
                      >
                        <FaFilePdf className="text-red-500 text-xl hover:text-red-600 transition-colors" />
                      </Link>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                          <Link href={`/student/assignments/view/${assignment._id}`}>
                            {assignment.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {assignment.course?.courseName} • {assignment.course?.courseCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isChecking ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                          Checking...
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
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
                        className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
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
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {assignment.description}
                  </p>

                  {/* Submission Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <FiClock className="flex-shrink-0" />
                    <span>Submission: {formatDateLong(assignment.submissionDate)}</span>
                  </div>

                  {/* Chapter */}
                  {assignment.chapter && (
                    <div className="mb-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${courseStyle.badge}`}>
                        Chapter {assignment.chapter}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200 mt-2">
                    {assignment.pdfUrl && (
                      <Link
                        href={`/student/assignments/view/${assignment._id}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                      >
                        <FiEye size={14} /> View
                      </Link>
                    )}
                    <button
                      onClick={() => toggleAssignment(assignment._id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                    >
                      {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                      {isExpanded ? "Hide" : "View Submissions"}
                    </button>
                  </div>

                  {/* Submissions List - Expandable */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
                        <FiCheckCircle className="text-green-600" />
                        All Student Submissions
                      </h4>
                      {allSubmissions.length === 0 ? (
                        <p className="text-gray-500 text-center py-3 text-sm">No submissions yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100 rounded-lg">
                              <tr>
                                <th className="px-2 py-1.5 text-left text-gray-800">#</th>
                                <th className="px-2 py-1.5 text-left text-gray-800">Student</th>
                                <th className="px-2 py-1.5 text-left text-gray-800">ID</th>
                                <th className="px-2 py-1.5 text-left text-gray-800">Date</th>
                                <th className="px-2 py-1.5 text-left text-gray-800">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {allSubmissions.map((sub, index) => (
                                <tr key={sub._id} className="hover:bg-gray-50 transition">
                                  <td className="px-2 py-1.5 text-gray-600">{index + 1}</td>
                                  <td className="px-2 py-1.5 font-medium text-gray-900">
                                    {sub.studentName || sub.student?.name}
                                    {String(sub.student?._id || sub.student) === String(user?._id) && (
                                      <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">You</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-600">
                                    {sub.studentCollegeId || sub.student?.collegeId}
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                                    {sub.submittedAt ? formatDateShort(sub.submittedAt) : "N/A"}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                                        sub.status === "onTime"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {sub.status === "onTime" ? "On Time" : "Late"}
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
  );
};

export default StudentAssignment;