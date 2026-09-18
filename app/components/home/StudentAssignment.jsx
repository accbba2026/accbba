"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiFileText,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiCalendar,
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

  console.log(assignments);
  console.log(submissionStatusMap);

  const studentSemester = user?.semester || "1st";

  // Re-implemented Course Color Mapping with 3D Claymorphism Themes
  const courseColorMap = useMemo(() => {
    const colorMap = new Map();
    const courseThemes = [
      {
        // Green
        container:
          "bg-[#a5dc9c] shadow-[10px_10px_20px_#8cbb84,-10px_-10px_20px_#beffb4] md:shadow-[15px_15px_30px_#8cbb84,-15px_-15px_30px_#beffb4] border-[#b4f0aa]",
        header:
          "bg-[#afd8a8] shadow-[6px_6px_12px_#95b88f,-6px_-6px_12px_#c9f8c1,inset_1px_1px_2px_rgba(255,255,255,0.5)] border-white/20",
        pill: "bg-[#a5dc9c] shadow-[inset_3px_3px_6px_#8cbb84,inset_-3px_-3px_6px_#beffb4] border-white/30 text-green-800",
        deadline:
          "bg-[#b3e3aa] shadow-[inset_4px_4px_8px_#99c191,inset_-4px_-4px_8px_rgba(255,255,255,0.7)]",
        text: "text-green-800",
      },
      {
        // Blue
        container:
          "bg-[#a5c9dc] shadow-[10px_10px_20px_#8caabf,-10px_-10px_20px_#bee8fd] md:shadow-[15px_15px_30px_#8caabf,-15px_-15px_30px_#bee8fd] border-[#b4daf0]",
        header:
          "bg-[#afd1e6] shadow-[6px_6px_12px_#95b2c4,-6px_-6px_12px_#c9f0ff,inset_1px_1px_2px_rgba(255,255,255,0.5)] border-white/20",
        pill: "bg-[#a5c9dc] shadow-[inset_3px_3px_6px_#8caabf,inset_-3px_-3px_6px_#bee8fd] border-white/30 text-blue-800",
        deadline:
          "bg-[#b3d7ee] shadow-[inset_4px_4px_8px_#99b7cb,inset_-4px_-4px_8px_rgba(255,255,255,0.7)]",
        text: "text-blue-800",
      },
      {
        // Purple
        container:
          "bg-[#c5a5dc] shadow-[10px_10px_20px_#a78cbb,-10px_-10px_20px_#e3beff] md:shadow-[15px_15px_30px_#a78cbb,-15px_-15px_30px_#e3beff] border-[#d6b4f0]",
        header:
          "bg-[#cbafe6] shadow-[6px_6px_12px_#ad95c4,-6px_-6px_12px_#e9c9ff,inset_1px_1px_2px_rgba(255,255,255,0.5)] border-white/20",
        pill: "bg-[#c5a5dc] shadow-[inset_3px_3px_6px_#a78cbb,inset_-3px_-3px_6px_#e3beff] border-white/30 text-purple-800",
        deadline:
          "bg-[#d3b3ee] shadow-[inset_4px_4px_8px_#b399cb,inset_-4px_-4px_8px_rgba(255,255,255,0.7)]",
        text: "text-purple-800",
      },
      {
        // Orange
        container:
          "bg-[#dcb8a5] shadow-[10px_10px_20px_#bb9c8c,-10px_-10px_20px_#fdd4be] md:shadow-[15px_15px_30px_#bb9c8c,-15px_-15px_30px_#fdd4be] border-[#f0c9b4]",
        header:
          "bg-[#e6c1af] shadow-[6px_6px_12px_#c4a495,-6px_-6px_12px_#ffdec9,inset_1px_1px_2px_rgba(255,255,255,0.5)] border-white/20",
        pill: "bg-[#dcb8a5] shadow-[inset_3px_3px_6px_#bb9c8c,inset_-3px_-3px_6px_#fdd4be] border-white/30 text-orange-800",
        deadline:
          "bg-[#eec7b3] shadow-[inset_4px_4px_8px_#cba999,inset_-4px_-4px_8px_rgba(255,255,255,0.7)]",
        text: "text-orange-800",
      },
      {
        // Pink
        container:
          "bg-[#dca5bd] shadow-[10px_10px_20px_#bb8ca1,-10px_-10px_20px_#ffbed9] md:shadow-[15px_15px_30px_#bb8ca1,-15px_-15px_30px_#ffbed9] border-[#f0b4ce]",
        header:
          "bg-[#e6afd1] shadow-[6px_6px_12px_#c495b2,-6px_-6px_12px_#ffc9f0,inset_1px_1px_2px_rgba(255,255,255,0.5)] border-white/20",
        pill: "bg-[#dca5bd] shadow-[inset_3px_3px_6px_#bb8ca1,inset_-3px_-3px_6px_#ffbed9] border-white/30 text-pink-800",
        deadline:
          "bg-[#eeb3d3] shadow-[inset_4px_4px_8px_#cb99b3,inset_-4px_-4px_8px_rgba(255,255,255,0.7)]",
        text: "text-pink-800",
      },
    ];

    let colorIndex = 0;
    assignments.forEach((assignment) => {
      const courseId = assignment.course?._id;
      if (courseId && !colorMap.has(courseId)) {
        colorMap.set(courseId, courseThemes[colorIndex % courseThemes.length]);
        colorIndex++;
      }
    });

    return colorMap;
  }, [assignments]);

  // Extract unique courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map();
    assignments.forEach((assignment) => {
      if (assignment.course?._id && !courseMap.has(assignment.course._id)) {
        courseMap.set(assignment.course._id, {
          id: assignment.course._id,
          name: assignment.course.courseName,
          code: assignment.course.courseCode,
        });
      }
    });
    return Array.from(courseMap.values());
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
        setLoading(false);
        // Fire off submission checks in background (non-blocking)
        checkAllSubmissionsStatus(data.data);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setLoading(false);
    }
  };

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

  // Fire off all submission status checks in parallel (non-blocking)
  const checkAllSubmissionsStatus = (assignmentsList) => {
    assignmentsList.forEach((assignment) => {
      checkSubmissionStatus(assignment._id);
    });
  };

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
        setExpandedAssignments((prev) => ({ ...prev }));
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

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

  // Returns null status if still checking (so we can show shimmer)
  const getSubmissionStatusText = (assignmentId) => {
    if (checkingSubmission[assignmentId]) return null;
    const statusData = submissionStatusMap[assignmentId];
    if (!statusData || !statusData.submitted) {
      return { text: "Late Submission Allowed", color: "red", icon: "❌" };
    } else {
      return { text: "Submitted", color: "green", icon: "✅" };
    }
  };

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
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter assignments based on search and course selection
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.course?.courseName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        assignment.course?.courseCode
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesCourse =
        selectedCourse === "all" || assignment.course?._id === selectedCourse;
      return matchesSearch && matchesCourse;
    });
  }, [assignments, searchTerm, selectedCourse]);

  // Group filtered assignments by course
  const groupedAssignments = useMemo(() => {
    const groups = new Map();

    // Sort assignments by course name, then by title
    const sortedAssignments = [...filteredAssignments].sort((a, b) => {
      const courseA = a.course?.courseName || "";
      const courseB = b.course?.courseName || "";
      if (courseA !== courseB) return courseA.localeCompare(courseB);
      return (a.title || "").localeCompare(b.title || "");
    });

    sortedAssignments.forEach((assignment) => {
      const courseId = assignment.course?._id || "unknown";
      const courseName = assignment.course?.courseName || "Unknown Course";
      const courseCode = assignment.course?.courseCode || "";

      if (!groups.has(courseId)) {
        groups.set(courseId, {
          courseId,
          courseName,
          courseCode,
          assignments: [],
        });
      }
      groups.get(courseId).assignments.push(assignment);
    });

    return Array.from(groups.values());
  }, [filteredAssignments]);

  if (!user || user?.role === "faculty" || user?.role === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 rounded-2xl p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 md:p-3 rounded-2xl shadow-lg">
              <FiFileText className="text-xl md:text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                My Assignments
              </h1>
              <p className="text-gray-500 text-xs md:text-sm mt-1">
                {studentSemester} Semester • {filteredAssignments.length} Total
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search by assignment name or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 md:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm md:text-base text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>

            {/* Course Filter Dropdown */}
            <div className="relative md:w-72">
              <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full pl-12 pr-10 py-3 md:py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm md:text-base text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
              >
                <option value="all">All Courses</option>
                {uniqueCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} {course.code ? `(${course.code})` : ""}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || selectedCourse !== "all") && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">
                Active filters:
              </span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1 hover:text-blue-900 transition-colors"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedCourse !== "all" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                  Course:{" "}
                  {uniqueCourses.find((c) => c.id === selectedCourse)?.name}
                  <button
                    onClick={() => setSelectedCourse("all")}
                    className="ml-1 hover:text-purple-900 transition-colors"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCourse("all");
                }}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Assignments List - Grouped by Course */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : groupedAssignments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-200">
            <FiFileText className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm md:text-base">
              {searchTerm || selectedCourse !== "all"
                ? "No assignments match your search criteria"
                : "No assignments found"}
            </p>
            {(searchTerm || selectedCourse !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCourse("all");
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-12 md:gap-16">
            {groupedAssignments.map((group) => {
              const theme =
                courseColorMap.get(group.courseId) ||
                courseColorMap.values().next().value;

              return (
                <div key={group.courseId} className="flex flex-col gap-6">
                  {/* Course Header */}
                  <div
                    className={`rounded-2xl p-4 md:p-5 border ${theme.header}`}
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`p-2 md:p-2.5 rounded-xl ${theme.pill}`}>
                        <FiFileText className="text-lg md:text-xl" />
                      </div>
                      <div className="min-w-0">
                        <h2
                          className={`text-lg md:text-xl font-bold truncate ${theme.text}`}
                        >
                          {group.courseName}
                        </h2>
                        <p className="text-gray-600 text-xs md:text-sm font-medium">
                          {group.courseCode && `${group.courseCode} • `}
                          {group.assignments.length} Assignment
                          {group.assignments.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assignments Grid - 2 columns on md/lg, 1 on sm */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {group.assignments.map((assignment) => {
                      const isExpanded = expandedAssignments[assignment._id];
                      const submissionStatus = getSubmissionStatusText(
                        assignment._id,
                      );
                      const isStatusLoading = submissionStatus === null;
                      const deadlineStatus = getDeadlineStatus(
                        assignment.submissionDate,
                      );
                      const allSubmissions =
                        window.allSubmissions?.[assignment._id] || [];

                      const isSubmitted =
                        submissionStatus?.text === "Submitted";
                      const statusDotGlow = isSubmitted
                        ? "bg-emerald-400"
                        : "bg-red-400";
                      const statusDotCore = isSubmitted
                        ? "bg-emerald-500 border-emerald-200"
                        : "bg-red-500 border-white/80";
                      const statusTextColor = isSubmitted
                        ? "text-emerald-700"
                        : "text-[#c42020]";
                      const statusIconColor = isSubmitted
                        ? "text-emerald-600"
                        : "text-[#dd4b4b]";

                      return (
                        <div
                          key={assignment._id}
                          className={`relative rounded-[32px] md:rounded-[36px] p-4 md:p-5 border flex flex-col ${theme.container}`}
                        >
                          {/* Top Embossed Header Card */}
                          <div
                            className={`rounded-[20px] md:rounded-[24px] p-3 md:p-4 mb-4 border flex items-center gap-3 ${theme.header}`}
                          >
                            <div className="bg-[#ff5c5c] p-2 md:p-2.5 rounded-xl shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(255,92,92,0.4)] shrink-0">
                              <FaFilePdf className="text-white text-xl md:text-2xl drop-shadow-sm" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm md:text-base font-bold text-gray-800 drop-shadow-sm truncate">
                                {assignment.title}
                              </h3>
                              <p className="text-gray-700 text-xs font-medium truncate mt-0.5">
                                {assignment.course?.courseName} •{" "}
                                {assignment.course?.courseCode}
                              </p>
                            </div>
                          </div>

                          {/* Chapter Pill */}
                          {assignment.chapter && (
                            <div
                              className={`inline-block self-start rounded-full px-4 py-1.5 mb-4 border text-xs font-bold tracking-wide ${theme.pill}`}
                            >
                              Chapter {assignment.chapter}
                            </div>
                          )}

                          {/* Status Bar - Shows Shimmer while loading */}
                          <div className="bg-gradient-to-b from-[#f8f9f8] to-[#e4e5e4] rounded-full p-1.5 pr-3 mb-4 flex items-center justify-between shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_2px_2px_rgba(255,255,255,1)] border border-white min-h-[44px]">
                            {isStatusLoading ? (
                              <>
                                <div className="flex items-center gap-2 px-2 flex-1">
                                  {/* Shimmer dot */}
                                  <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse"></div>
                                  </div>
                                  {/* Shimmer text bar */}
                                  <div className="h-3 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] w-32 md:w-40"></div>
                                </div>
                                {/* Shimmer icon */}
                                <div className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-gray-200 animate-pulse shrink-0"></div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 px-2">
                                  <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                    <div
                                      className={`absolute w-full h-full rounded-full blur-[4px] opacity-80 ${statusDotGlow}`}
                                    ></div>
                                    <div
                                      className={`relative w-3 h-3 rounded-full border-2 ${statusDotCore}`}
                                    ></div>
                                  </div>
                                  <span
                                    className={`text-xs md:text-sm font-bold tracking-wide ${statusTextColor}`}
                                  >
                                    {submissionStatus.text}
                                  </span>
                                </div>
                                <FiClock
                                  className={`text-xl md:text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)] shrink-0 ${statusIconColor}`}
                                />
                              </>
                            )}
                          </div>

                          {/* Deadline Box */}
                          <div
                            className={`rounded-[16px] p-4 mb-4 border border-transparent ${theme.deadline}`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <FiCalendar className="text-gray-700 text-xl md:text-2xl drop-shadow-sm shrink-0" />
                                <div className="flex flex-col text-gray-700 font-medium text-xs">
                                  <span>Submission</span>
                                  <span>Deadline:</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="block text-gray-800 font-semibold text-xs md:text-sm leading-tight">
                                  {formatDateLong(assignment.submissionDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Status Text */}
                          {!isStatusLoading &&
                            deadlineStatus.text === "Expired" &&
                            !isSubmitted && (
                              <p
                                className={`font-bold text-sm mb-3 ml-1 tracking-wide ${theme.text}`}
                              >
                                You can still submit
                              </p>
                            )}

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-3 mt-auto">
                            {assignment.pdfUrl && (
                              <Link
                                href={`/student/assignments/view/${assignment._id}`}
                                className="w-full bg-blue-100/40 backdrop-blur-md border border-white/60 text-blue-700 font-bold text-sm rounded-full py-3 flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(59,130,246,0.15),inset_0_3px_6px_rgba(255,255,255,0.8)] hover:bg-blue-100/60 hover:shadow-[0_12px_20px_rgba(59,130,246,0.2),inset_0_3px_6px_rgba(255,255,255,0.9)] transition-all duration-300"
                              >
                                <FiEye className="text-lg drop-shadow-sm" />{" "}
                                View Assignment
                              </Link>
                            )}

                            <button
                              onClick={() => toggleAssignment(assignment._id)}
                              className="w-full bg-gradient-to-b from-[#e8e9e8] to-[#d1d2d1] border-t border-white text-gray-700 font-bold text-sm rounded-full py-3 flex items-center justify-center gap-2 shadow-[0_6px_12px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8)] active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.1)] transition-all"
                            >
                              {isExpanded ? (
                                <FiChevronUp className="text-lg" />
                              ) : (
                                <FiChevronDown className="text-lg" />
                              )}
                              {isExpanded
                                ? "Hide Submissions"
                                : "View All Submissions"}
                            </button>
                          </div>

                          {/* Expanded Submissions List */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/30">
                              <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                                <FiUsers
                                  className={`text-base ${theme.text}`}
                                />{" "}
                                All Submissions ({allSubmissions.length})
                              </h4>
                              {allSubmissions.length === 0 ? (
                                <p className="text-center text-gray-700 font-medium text-xs py-3">
                                  No submissions yet.
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {allSubmissions.map((sub) => (
                                    <div
                                      key={sub._id}
                                      className="bg-white/40 backdrop-blur-sm rounded-xl p-2.5 flex justify-between items-center shadow-[inset_1px_1px_3px_rgba(255,255,255,0.5)] border border-white/20"
                                    >
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-gray-800 text-xs truncate">
                                          {sub.studentName || sub.student?.name}
                                        </span>
                                        <span className="text-[10px] text-gray-700 font-mono truncate">
                                          {sub.studentCollegeId ||
                                            sub.student?.collegeId}
                                        </span>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <span className="text-[10px] font-bold text-gray-700 block">
                                          {sub.submittedAt
                                            ? new Date(
                                                sub.submittedAt,
                                              ).toLocaleDateString()
                                            : "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shimmer keyframes - add this to your global CSS if not present */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentAssignment;
