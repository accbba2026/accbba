// app/components/home/AssignmentSubmissionToday.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiUserPlus,
  FiX,
  FiDownload,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { FaUserCheck, FaFilePdf } from "react-icons/fa";

const AssignmentSubmissionToday = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [expandedAssignments, setExpandedAssignments] = useState({});
  const [assignmentSubmissions, setAssignmentSubmissions] = useState({});
  const [submissionsLoading, setSubmissionsLoading] = useState({});

  // Submission Modal
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    studentIds: [],
    studentInput: "",
    submissionDate: "",
  });
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [modalStudents, setModalStudents] = useState([]);

  // Only show for faculty, admin, or CR (non-student roles)
  if (!user || user?.role === "student" || user?.role === "cr") {
    return null;
  }

  // Format date to YYYY-MM-DD for comparison
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Fetch assignments and students
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch assignments
        const assignmentsRes = await fetch("/api/faculty/assignments");
        const assignmentsData = await assignmentsRes.json();

        let todayAssignments = [];
        
        if (assignmentsData.success) {
          const today = getTodayDate();
          
          // Filter assignments with submission date today
          todayAssignments = assignmentsData.data.filter((assignment) => {
            const submissionDate = new Date(assignment.submissionDate);
            submissionDate.setHours(0, 0, 0, 0);
            return submissionDate.getTime() === today.getTime();
          });
          
          setAssignments(todayAssignments);
        }

        // Fetch students for each semester that has today's assignments
        if (todayAssignments.length > 0) {
          const uniqueSemesters = [...new Set(todayAssignments.map(a => a.semester))];
          const studentsMap = new Map();
          
          for (const semester of uniqueSemesters) {
            const studentsRes = await fetch(`/api/faculty/get-students?semester=${semester}`);
            const studentsData = await studentsRes.json();
            if (studentsData.success) {
              studentsData.data.forEach(student => {
                if (!studentsMap.has(student._id)) {
                  studentsMap.set(student._id, student);
                }
              });
            }
          }
          
          setAllStudents(Array.from(studentsMap.values()));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setMessage({ type: "error", text: "Failed to load data" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch submissions for an assignment
  const fetchSubmissionsForAssignment = async (assignmentId) => {
    setSubmissionsLoading((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await fetch(
        `/api/faculty/assignments/submissions?assignmentId=${assignmentId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch submissions");

      const data = await response.json();
      if (data.success) {
        setAssignmentSubmissions((prev) => ({
          ...prev,
          [assignmentId]: data.data,
        }));
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setSubmissionsLoading((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  // Toggle assignment expansion
  const toggleAssignment = async (assignmentId) => {
    const isExpanded = expandedAssignments[assignmentId];
    setExpandedAssignments((prev) => ({
      ...prev,
      [assignmentId]: !isExpanded,
    }));

    if (!isExpanded && !assignmentSubmissions[assignmentId]) {
      await fetchSubmissionsForAssignment(assignmentId);
    }
  };

  // Open submission modal
  const openSubmissionModal = async (assignment) => {
    setSelectedAssignment(assignment);
    await fetchSubmissionsForAssignment(assignment._id);
    
    // Filter students for this assignment's semester
    const semesterStudents = allStudents.filter(s => s.semester === assignment.semester);
    setModalStudents(semesterStudents);
    
    setSubmissionData({ 
      studentIds: [], 
      studentInput: "", 
      submissionDate: new Date().toISOString().slice(0, 16) 
    });
    setShowSubmissionModal(true);
  };

  // Search students by college ID or name (using collegeId field, not _id)
  const handleStudentInputChange = (e) => {
    const value = e.target.value;
    setSubmissionData({ ...submissionData, studentInput: value });

    if (value.length > 1) {
      const filtered = modalStudents.filter(
        (s) =>
          (s.collegeId && s.collegeId.toLowerCase().includes(value.toLowerCase())) ||
          (s.name && s.name.toLowerCase().includes(value.toLowerCase()))
      );
      setStudentSuggestions(filtered.slice(0, 5));
    } else {
      setStudentSuggestions([]);
    }
  };

  // Add student to submission list using student _id
  const addStudent = (student) => {
    if (!submissionData.studentIds.includes(student._id)) {
      setSubmissionData({
        ...submissionData,
        studentIds: [...submissionData.studentIds, student._id],
        studentInput: "",
      });
    }
    setStudentSuggestions([]);
  };

  // Add multiple students by college IDs (using collegeId field)
  const addMultipleStudents = (collegeIdsString) => {
    const ids = collegeIdsString.split(/[,\s\n]+/).filter((id) => id.trim().length > 0);
    const newStudentIds = [...submissionData.studentIds];
    const notFoundIds = [];

    ids.forEach((collegeId) => {
      // Find student by collegeId (not _id)
      const student = modalStudents.find(
        (s) => s.collegeId && s.collegeId.toString().trim() === collegeId.toString().trim()
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

    setSubmissionData({
      ...submissionData,
      studentIds: newStudentIds,
      studentInput: "",
    });
    setStudentSuggestions([]);
  };

  // Remove student from submission list
  const removeStudent = (studentId) => {
    setSubmissionData({
      ...submissionData,
      studentIds: submissionData.studentIds.filter((id) => id !== studentId),
    });
  };

  // Submit assignment for selected students
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (submissionData.studentIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one student" });
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/faculty/assignments/bulk-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment._id,
          studentIds: submissionData.studentIds,
          submissionDate: submissionData.submissionDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Submission failed");
      }

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `✓ Submitted successfully for ${data.submittedCount} student(s)!`,
        });
        setShowSubmissionModal(false);
        setSubmissionData({ studentIds: [], studentInput: "", submissionDate: "" });
        // Refresh submissions
        await fetchSubmissionsForAssignment(selectedAssignment._id);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Error submitting:", error);
      setMessage({ type: "error", text: error.message });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getSubmissionStatus = (submissionDate, dueDate) => {
    if (!submissionDate) return { text: "Not Submitted", color: "gray" };
    const subDate = new Date(submissionDate);
    const due = new Date(dueDate);
    subDate.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return subDate <= due 
      ? { text: "On Time", color: "green" }
      : { text: "Late", color: "red" };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Today's Submissions</h2>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 text-sm mt-2">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📋 Today's Submissions</h2>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FiAlertCircle className="text-gray-400 text-xl" />
          </div>
          <p className="text-gray-500 text-sm">No assignments due today</p>
          <p className="text-gray-400 text-xs mt-1">All caught up! 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span>📋</span> Today's Submissions ({assignments.length})
      </h2>

      {/* Message Display */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "error" && <FiAlertCircle className="flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {assignments.map((assignment) => {
          const submissions = assignmentSubmissions[assignment._id] || [];
          const isExpanded = expandedAssignments[assignment._id];
          const isLoadingSubmissions = submissionsLoading[assignment._id];
          const submittedCount = submissions.length;

          return (
            <div
              key={assignment._id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
            >
              {/* Assignment Header */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-white">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FaFilePdf className="text-red-500 text-sm" />
                      <h3 className="font-semibold text-gray-800">{assignment.title}</h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {assignment.semester} Sem
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mb-2 line-clamp-1">
                      {assignment.course?.courseName || assignment.courseName}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>📅 Due: {formatDate(assignment.submissionDate)}</span>
                      <span>📝 Submissions: {submittedCount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {assignment.pdfUrl && (
                      <button
                        onClick={() => window.open(assignment.pdfUrl, "_blank")}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                        title="Download Assignment"
                      >
                        <FiDownload size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => openSubmissionModal(assignment)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition"
                    >
                      <FiUserPlus size={14} /> Add Submission
                    </button>
                    <button
                      onClick={() => toggleAssignment(assignment._id)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition"
                    >
                      {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submissions List */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-3">
                  <h4 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-2">
                    <FaUserCheck className="text-blue-500" /> Student Submissions ({submissions.length})
                  </h4>
                  {isLoadingSubmissions ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                    </div>
                  ) : submissions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">No submissions yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600 text-xs">Student</th>
                            <th className="px-3 py-2 text-left text-gray-600 text-xs">College ID</th>
                            <th className="px-3 py-2 text-left text-gray-600 text-xs">Submitted At</th>
                            <th className="px-3 py-2 text-left text-gray-600 text-xs">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((sub, idx) => {
                            const status = getSubmissionStatus(sub.submittedAt, assignment.submissionDate);
                            return (
                              <tr key={sub._id} className="border-t">
                                <td className="px-3 py-2 text-gray-700 text-xs">
                                  {sub.studentName || sub.student?.name}
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-xs">
                                  {sub.studentCollegeId || sub.student?.collegeId}
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-xs">
                                  {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "N/A"}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    status.color === "green" 
                                      ? "bg-green-100 text-green-700" 
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {status.text}
                                  </span>
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
          );
        })}
      </div>

      {/* Submission Modal */}
      {showSubmissionModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">
                Submit: {selectedAssignment.title.length > 40 
                  ? selectedAssignment.title.substring(0, 40) + "..." 
                  : selectedAssignment.title}
              </h3>
              <button onClick={() => setShowSubmissionModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="p-4 space-y-4">
              {/* Submission Date */}
              <div>
                <label className="block text-gray-700 mb-1 font-medium text-sm">Submission Date *</label>
                <input
                  type="datetime-local"
                  value={submissionData.submissionDate}
                  onChange={(e) => setSubmissionData({ ...submissionData, submissionDate: e.target.value })}
                  required
                  className="w-full text-gray-600 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              {/* Add by College ID - Uses collegeId field */}
              <div>
                <label className="block text-gray-700 mb-1 font-medium text-sm">Add by College ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="collegeIdsInput"
                    placeholder="Enter college IDs (e.g., 521017, 521018)"
                    className="flex-1 text-gray-600 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("collegeIdsInput");
                      if (input && input.value) {
                        addMultipleStudents(input.value);
                        input.value = "";
                      }
                    }}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Separate multiple IDs with commas or spaces</p>
              </div>

              {/* Search Student - Search by name or collegeId */}
              <div>
                <label className="block text-gray-700 mb-1 font-medium text-sm">Search Student</label>
                <div className="relative">
                  <input
                    type="text"
                    value={submissionData.studentInput}
                    onChange={handleStudentInputChange}
                    placeholder="Search by name or college ID..."
                    className="w-full text-gray-600 px-3 py-2 border rounded-lg text-sm"
                  />
                  {studentSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-auto">
                      {studentSuggestions.map((student) => (
                        <button
                          key={student._id}
                          type="button"
                          onClick={() => addStudent(student)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between text-sm border-b last:border-b-0"
                        >
                          <span className="text-gray-700">{student.name}</span>
                          <span className="text-xs text-gray-500">ID: {student.collegeId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Students Count */}
              <div className="bg-blue-50 rounded p-2">
                <p className="text-xs text-blue-800">
                  <strong>{modalStudents.length}</strong> students in {selectedAssignment.semester} semester
                </p>
              </div>

              {/* Selected Students */}
              {submissionData.studentIds.length > 0 && (
                <div>
                  <label className="block text-gray-700 mb-1 font-medium text-sm">
                    Selected ({submissionData.studentIds.length})
                  </label>
                  <div className="border rounded-lg max-h-32 overflow-y-auto">
                    {submissionData.studentIds.map((studentId) => {
                      const student = modalStudents.find(s => s._id === studentId);
                      if (!student) return null;
                      return (
                        <div key={studentId} className="flex justify-between items-center p-2 border-b">
                          <div>
                            <p className="text-sm text-gray-800">{student.name}</p>
                            <p className="text-xs text-gray-500">College ID: {student.collegeId}</p>
                          </div>
                          <button type="button" onClick={() => removeStudent(studentId)} className="text-red-500">
                            <FiX size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || submissionData.studentIds.length === 0}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <FaUserCheck size={14} />
                {uploading ? "Submitting..." : `Submit (${submissionData.studentIds.length})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmissionToday;