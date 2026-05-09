// app/faculty/assignments/report/page.js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { FiArrowLeft, FiDownload } from "react-icons/fi";

export default function FacultyReportPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [hasSelectedSemester, setHasSelectedSemester] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const semesters = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  // Add print styles for A4
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
        body {
          padding: 0;
          margin: 0;
          background: white;
        }
        .print-container {
          padding: 0;
          margin: 0;
        }
        .report-page {
          page-break-after: always;
          margin: 0;
          padding: 0.5cm;
        }
        .report-page:last-child {
          page-break-after: auto;
        }
        table {
          width: 100%;
          font-size: 10pt;
        }
        @page {
          size: A4;
          margin: 0.5cm;
        }
        h3 {
          margin: 0 0 5px 0;
        }
        .header-info {
          margin-bottom: 8px;
        }
        th, td {
          padding: 4px 6px !important;
        }
      }
      .status-on-time {
        color: #166534;
        font-weight: 500;
      }
      .status-late {
        color: #991b1b;
        font-weight: 500;
      }
      .status-no-submission {
        color: #9ca3af;
      }
      @media screen {
        .report-page {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          padding: 16px;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Format date helper
  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString("default", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateTime = (date) => {
    return `${formatDate(date)} at ${new Date(date).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
  };

  // Fetch all courses on page load
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const response = await fetch(`/api/faculty/courses`);
        const result = await response.json();

        if (result.success) {
          setAllCourses(result.data);
        } else {
          console.error("Failed to fetch courses:", result.message);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  // Filter courses when semester changes
  useEffect(() => {
    if (selectedSemester) {
      const filtered = allCourses.filter(
        (course) => course.semester === selectedSemester
      );
      setFilteredCourses(filtered);
      setSelectedCourse(""); // Reset selected course when semester changes
      setHasSelectedSemester(true);
    } else {
      setFilteredCourses([]);
      setHasSelectedSemester(false);
    }
  }, [selectedSemester, allCourses]);

  // Fetch report when semester and course are selected
  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedSemester || !selectedCourse || selectedCourse === "") return;

      setLoading(true);

      try {
        const url = `/api/faculty/assignment-report?semester=${selectedSemester}&courseId=${selectedCourse}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setReportData(result.data);
        } else {
          console.error("Failed to fetch report:", result.message);
          setReportData(null);
        }
      } catch (error) {
        console.error("Error fetching report:", error);
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedSemester, selectedCourse]);

  const getSubmissionStatus = (assignmentId, studentId) => {
    if (!reportData || !reportData.submissions) return null;

    const submission = reportData.submissions.find(
      (sub) => sub.assignmentId === assignmentId && sub.studentId === studentId,
    );

    if (!submission) {
      return { text: "", class: "status-no-submission" };
    }

    const assignment = reportData.assignments.find(
      (a) => a._id === assignmentId,
    );
    const subDate = new Date(submission.submittedAt);
    const dueDate = new Date(assignment.submissionDate);

    subDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (subDate <= dueDate) {
      return { text: "✅ On Time", class: "status-on-time" };
    } else {
      return { text: "⚠️ Late", class: "status-late" };
    }
  };

  // Group assignments by course
  const getAssignmentsByCourse = () => {
    if (!reportData) return {};

    return reportData.assignments.reduce((acc, assignment) => {
      const courseId = assignment.courseId;
      if (!acc[courseId]) {
        acc[courseId] = {
          courseName: assignment.courseName,
          courseCode: assignment.courseCode,
          assignments: [],
        };
      }
      acc[courseId].assignments.push(assignment);
      return acc;
    }, {});
  };

  // Loading courses initial state
  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading courses...</p>
        </div>
      </div>
    );
  }

  // Initial state - no semester selected
  if (!hasSelectedSemester) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-5xl">
          <div className="no-print mb-4 flex flex-wrap justify-between items-center gap-3">
            <Link
              href="/faculty/assignments"
              className="flex items-center gap-2 text-purple-600 text-sm"
            >
              <FiArrowLeft /> Back to Assignments
            </Link>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-1.5 w-full sm:w-auto min-w-[180px] text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a semester</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} Semester
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={!selectedSemester}
              >
                <FiDownload size={14} /> Print
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
            <div className="mb-3 sm:mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiDownload className="text-gray-400 text-xl sm:text-2xl md:text-2xl" />
              </div>
            </div>
            <p className="text-gray-700 font-medium text-base sm:text-lg mb-1 sm:mb-2">
              No Report Selected
            </p>
            <p className="text-gray-500 text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto px-2">
              Please select a semester from the dropdown above to view the
              assignment submission report
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Select course state - semester selected but no course yet
  if (!selectedCourse) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-5xl">
          <div className="no-print mb-4 flex flex-wrap justify-between items-center gap-3">
            <Link
              href="/faculty/assignments"
              className="flex items-center gap-2 text-purple-600 text-sm"
            >
              <FiArrowLeft /> Back to Assignments
            </Link>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-1.5 w-full sm:w-auto min-w-[180px] text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} Semester
                  </option>
                ))}
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-1.5 w-full sm:w-auto min-w-[200px] text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a course</option>
                {filteredCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseName} ({course.courseCode})
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={!selectedCourse}
              >
                <FiDownload size={14} /> Print
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6 md:p-8 text-center">
            <div className="mb-3 sm:mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiDownload className="text-gray-400 text-xl sm:text-2xl md:text-2xl" />
              </div>
            </div>
            <p className="text-gray-700 font-medium text-base sm:text-lg mb-1 sm:mb-2">
              Select a Course
            </p>
            <p className="text-gray-500 text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto px-2">
              {filteredCourses.length === 0 ? (
                <>No courses found for {selectedSemester} semester</>
              ) : (
                <>Please select a course from the dropdown above to view the
                assignment submission report for {selectedSemester} semester</>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state for report
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
        <div className="container mx-auto max-w-5xl px-2 sm:px-4">
          <div className="no-print mb-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <Link
              href="/faculty/assignments"
              className="flex items-center gap-2 text-purple-600 text-sm hover:text-purple-700 transition-colors w-full sm:w-auto justify-center sm:justify-start"
            >
              <FiArrowLeft size={16} />
              <span>Back to Assignments</span>
            </Link>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-2 sm:py-1.5 text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto min-w-[180px] md:min-w-[200px]"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} Semester
                  </option>
                ))}
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-2 sm:py-1.5 text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto min-w-[180px] md:min-w-[200px]"
              >
                <option value="">Select a course</option>
                {filteredCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseName} ({course.courseCode})
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={!selectedCourse}
              >
                <FiDownload size={14} />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 sm:p-8 md:p-12 text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
            </div>
            <p className="text-gray-600 text-sm sm:text-base">
              Loading report data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No data available for selected semester and course
  if (!reportData || reportData.assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="container mx-auto max-w-5xl">
          <div className="no-print mb-4 flex flex-wrap justify-between items-center gap-3">
            <Link
              href="/faculty/assignments"
              className="flex items-center gap-2 text-purple-600 text-sm"
            >
              <FiArrowLeft /> Back
            </Link>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3 py-2 sm:py-1.5 text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto min-w-[180px] md:min-w-[200px]"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} Semester
                  </option>
                ))}
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3 py-2 sm:py-1.5 text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto min-w-[180px] md:min-w-[200px]"
              >
                <option value="">Select a course</option>
                {filteredCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseName} ({course.courseCode})
                  </option>
                ))}
              </select>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={!selectedCourse}
              >
                <FiDownload size={14} /> Print
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              No assignments found for{" "}
              {filteredCourses.find((c) => c._id === selectedCourse)?.courseName ||
                "this course"} in {selectedSemester} semester
            </p>
          </div>
        </div>
      </div>
    );
  }

  const assignmentsByCourse = getAssignmentsByCourse();
  const studentList = reportData.students || [];

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="container mx-auto max-w-6xl">
        {/* Controls - Hidden when printing */}
        <div className="no-print mb-4 flex flex-wrap justify-between items-center gap-3">
          <Link
            href="/faculty/assignments"
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
          >
            <FiArrowLeft /> Back
          </Link>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-2 sm:py-1.5 text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto min-w-[180px] md:min-w-[200px]"
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem} Semester
                </option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 sm:py-1.5 text-sm border rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto min-w-[180px] md:min-w-[200px]"
            >
              <option value="">Select a course</option>
              {filteredCourses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition w-full sm:w-auto"
            >
              <FiDownload size={14} /> Print
            </button>
          </div>
        </div>

        {/* Report Content - A4 Optimized */}
        <div className="print-container">
          {Object.entries(assignmentsByCourse).map(
            ([courseId, courseData]) => (
              <div key={courseId} className="report-page">
                {/* Header */}
                <div className="border-b border-gray-300 pb-2 mb-3">
                  <h3 className="text-base font-bold text-gray-800">
                    {courseData.courseName} ({courseData.courseCode})
                  </h3>
                  <div className="text-xs text-gray-500 flex justify-between mt-1">
                    <span>Semester: {reportData.semester}</span>
                    <span>Date: {formatDate(new Date())}</span>
                  </div>
                </div>

                {/* Assignment Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-1.5 text-left text-xs font-semibold text-gray-700">
                          College ID
                        </th>
                        <th className="border border-gray-300 p-1.5 text-left text-xs font-semibold text-gray-700">
                          Student Name
                        </th>
                        {courseData.assignments.map((assignment, aidx) => (
                          <th
                            key={assignment._id}
                            className="border border-gray-300 p-1.5 text-center text-xs font-semibold text-gray-700"
                          >
                            <div>Assignment {aidx + 1}</div>
                            <div className="text-[10px] font-normal text-gray-500">
                              {formatDate(assignment.submissionDate)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentList.map((student) => {
                        const isCR = student.role === "cr";
                        return (
                          <tr
                            key={student._id}
                            className={isCR ? "bg-blue-50" : ""}
                          >
                            <td className="border border-gray-300 p-1.5 text-xs text-gray-600 font-mono">
                              {student.collegeId || "-"}
                            </td>
                            <td className="border border-gray-300 p-1.5 text-xs text-gray-700">
                              {student.name}
                              {isCR && (
                                <span className="ml-1 text-[9px] bg-blue-200 px-1 rounded">
                                  CR
                                </span>
                              )}
                            </td>
                            {courseData.assignments.map((assignment) => {
                              const status = getSubmissionStatus(
                                assignment._id,
                                student._id,
                              );
                              return (
                                <td
                                  key={assignment._id}
                                  className={`border border-gray-300 p-1.5 text-center text-xs ${status?.class || "status-no-submission"}`}
                                >
                                  {status?.text || "—"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="text-[9px] text-gray-400 text-center mt-2 pt-1 border-t border-gray-200">
                  Assignment Submission Report - Generated on{" "}
                  {formatDateTime(new Date())}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}