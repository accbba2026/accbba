// app/cr/assignments/page.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiSearch,
  FiRefreshCw,
  FiFileText,
  FiDownload,
  FiUpload,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiAlertCircle,
  FiUserPlus,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { FaStar, FaFilePdf, FaUserCheck } from "react-icons/fa";
import Link from "next/link";

// Report Modal Component

const CRAssignmentsPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState({});
  const [expandedAssignments, setExpandedAssignments] = useState({});
  const [assignmentSubmissions, setAssignmentSubmissions] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });

  // Submission Modal
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionData, setSubmissionData] = useState({
    studentIds: [],
    studentInput: "",
    submissionDate: "",
  });
  const [studentSuggestions, setStudentSuggestions] = useState([]);

  // Assignment Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // ✅ CORRECT: Declare formData state here
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    chapter: "",
    semester: "",
    course: "",
    submissionDate: "",
    dueDate: "",
    instructions: "",
    resources: [{ title: "", url: "" }],
    pdfFile: null,
  });

  const crSemester = user?.semester || "1st";
  const semesters = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  // Helper function to show error messages
  const showError = (error) => {
    console.error("Error:", error);
    setMessage({
      type: "error",
      text: error.message || "An unexpected error occurred",
    });
  };

  // Fetch assignments for CR's semester
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/cr/assignments?semester=${crSemester}`,
      );
      if (!response.ok) throw new Error("Failed to fetch assignments");

      const data = await response.json();
      if (data.success) setAssignments(data.data);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses for CR's semester
  const fetchCourses = async () => {
    try {
      const response = await fetch(`/api/cr/courses?semester=${crSemester}`);
      if (!response.ok) throw new Error("Failed to fetch courses");

      const data = await response.json();
      if (data.success) setCourses(data.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // Fetch students for CR's semester
  const fetchStudents = async () => {
    try {
      const response = await fetch(
        `/api/cr/get-students?semester=${crSemester}`,
      );
      if (!response.ok) throw new Error("Failed to fetch students");

      const data = await response.json();
      if (data.success) setStudents(data.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  // Fetch submissions for an assignment
  const fetchSubmissionsForAssignment = async (assignmentId) => {
    setSubmissionsLoading((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await fetch(
        `/api/cr/assignments/submissions?assignmentId=${assignmentId}`,
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

  useEffect(() => {
    if (user) {
      //eslint-disable-next-line
      fetchAssignments();
      fetchCourses();
      fetchStudents();
    }
  }, [user]);

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

  // Search students by college ID or name
  const handleStudentInputChange = (e) => {
    const value = e.target.value;
    setSubmissionData({ ...submissionData, studentInput: value });

    if (value.length > 1) {
      const filtered = students.filter(
        (s) =>
          s.collegeId?.includes(value) ||
          s.name?.toLowerCase().includes(value.toLowerCase()),
      );
      setStudentSuggestions(filtered.slice(0, 5));
    } else {
      setStudentSuggestions([]);
    }
  };

  // Add student to submission list
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

  // Add multiple students by college IDs (comma separated)
  const addMultipleStudents = (collegeIdsString) => {
    const ids = collegeIdsString.split(/[,\s]+/).filter((id) => id.trim());
    const newStudents = students.filter((s) => ids.includes(s.collegeId));
    const newStudentIds = [...submissionData.studentIds];

    newStudents.forEach((student) => {
      if (!newStudentIds.includes(student._id)) {
        newStudentIds.push(student._id);
      }
    });

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

    if (!submissionData.submissionDate) {
      setMessage({ type: "error", text: "Please select submission date" });
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/cr/assignments/bulk-submit", {
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
          text: `Assignment submitted successfully for ${data.submittedCount} student(s)!`,
        });
        setShowSubmissionModal(false);
        setSubmissionData({
          studentIds: [],
          studentInput: "",
          submissionDate: "",
        });
        // Refresh submissions for this assignment
        await fetchSubmissionsForAssignment(selectedAssignment._id);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
    } finally {
      setUploading(false);
    }
  };

  const getSubmissionStatus = (submissionDate) => {
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
    } else if (diffDays === -1) {
      return { text: "Expired", color: "red" };
    } else {
      return { text: "Expired", color: "red" };
    }
  };

  // Validate file before upload
  const validateFile = (file) => {
    if (!file) return { valid: false, message: "No file selected" };

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        message: `File too large! Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      };
    }

    if (file.type !== "application/pdf") {
      return { valid: false, message: "Only PDF files are allowed!" };
    }

    return { valid: true };
  };

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (file, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        formDataUpload.append("upload_preset", "bba_assignments");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/dgbfi39pm/upload`,
          {
            method: "POST",
            body: formDataUpload,
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message ||
              `Upload failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        if (!data.secure_url) {
          throw new Error("No URL returned from Cloudinary");
        }

        return {
          success: true,
          url: data.secure_url,
          publicId: data.public_id,
          fileName: file.name,
          fileSize: file.size,
        };
      } catch (error) {
        console.error(`Upload attempt ${i + 1} failed:`, error);

        if (i === retries - 1) {
          return {
            success: false,
            message:
              error.message || "Failed to upload file after multiple attempts",
          };
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i)),
        );
      }
    }
    return { success: false, message: "Upload failed" };
  };

  // CR Assignment Creation Functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const validation = validateFile(file);
    if (!validation.valid) {
      setMessage({ type: "error", text: validation.message });
      e.target.value = "";
      return;
    }
    setFormData({ ...formData, pdfFile: file });
  };

  // Add resource field
  const addResource = () => {
    setFormData({
      ...formData,
      resources: [...formData.resources, { title: "", url: "" }],
    });
  };

  // Remove resource field
  const removeResource = (index) => {
    const newResources = formData.resources.filter((_, i) => i !== index);
    setFormData({ ...formData, resources: newResources });
  };

  // Update resource field
  const updateResource = (index, field, value) => {
    const newResources = [...formData.resources];
    newResources[index][field] = value;
    setFormData({ ...formData, resources: newResources });
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingAssignment(null);
    setFormData({
      title: "",
      description: "",
      chapter: "",
      semester: crSemester,
      course: "",
      submissionDate: "",
      dueDate: "",
      instructions: "",
      resources: [{ title: "", url: "" }],
      pdfFile: null,
    });
    setShowCreateModal(true);
  };

  const openEditModal = (assignment) => {
    setIsEditing(true);
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      chapter: assignment.chapter || "",
      semester: assignment.semester,
      course: assignment.course?._id || assignment.course,
      submissionDate: assignment.submissionDate?.split("T")[0] || "",
      dueDate: assignment.dueDate?.split("T")[0] || "",
      instructions: assignment.instructions || "",
      resources: assignment.resources?.length
        ? assignment.resources
        : [{ title: "", url: "" }],
      pdfFile: null,
    });
    setShowCreateModal(true);
  };

  const openSubmissionModal = async (assignment) => {
    setSelectedAssignment(assignment);
    await fetchSubmissionsForAssignment(assignment._id);
    setSubmissionData({ studentIds: [], studentInput: "", submissionDate: "" });
    setShowSubmissionModal(true);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      if (!formData.title) throw new Error("Title is required");
      if (!formData.description) throw new Error("Description is required");
      if (!formData.course) throw new Error("Please select a course");

      let pdfData = null;
      if (formData.pdfFile) {
        const uploadResult = await uploadFileToCloudinary(formData.pdfFile);
        if (!uploadResult.success) throw new Error(uploadResult.message);
        pdfData = {
          pdfUrl: uploadResult.url,
          pdfPublicId: uploadResult.publicId,
          pdfFileName: uploadResult.fileName,
          pdfFileSize: uploadResult.fileSize,
        };
      } else if (
        !isEditing &&
        !formData.pdfFile &&
        (!formData.resources ||
          formData.resources.length === 0 ||
          !formData.resources[0].url)
      ) {
        // PDF is now optional - remove this error or show warning only
        // throw new Error("Please upload a PDF file or add resources");
      }

      const url = isEditing
        ? "/api/cr/assignments/update"
        : "/api/cr/assignments/create";
      const method = isEditing ? "PUT" : "POST";
      const body = {
        title: formData.title,
        description: formData.description,
        chapter: formData.chapter,
        semester: formData.semester,
        course: formData.course,
        submissionDate: formData.submissionDate,
        dueDate: formData.dueDate,
        instructions: formData.instructions,
        ...pdfData,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing ? { id: editingAssignment._id, ...body } : body,
        ),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: isEditing
            ? "Assignment updated successfully!"
            : "Assignment created successfully!",
        });
        setShowCreateModal(false);
        fetchAssignments();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (
      !confirm(
        "⚠️ Are you sure? All student submissions will be permanently deleted!",
      )
    )
      return;

    setLoading(true);
    try {
      const response = await fetch("/api/cr/assignments/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: "Assignment deleted successfully!",
        });
        fetchAssignments();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  // Create a map of course colors (consistent across all assignments)
  const courseColorMap = React.useMemo(() => {
    const colorMap = new Map();
    const lightColors = [
      "bg-green-200",
      "bg-blue-200",
      "bg-yellow-200",
      "bg-purple-200",
      "bg-pink-200",
      "bg-indigo-200",
      "bg-red-200",
      "bg-orange-200",
      "bg-teal-200",
      "bg-cyan-200",
      "bg-amber-200",
      "bg-lime-200",
      "bg-emerald-200",
      "bg-fuchsia-200",
      "bg-rose-200",
      "bg-sky-200",
    ];

    // Assign a unique color to each unique course
    let colorIndex = 0;
    assignments.forEach((assignment) => {
      const courseId = assignment.course?._id;
      const courseName = assignment.course?.courseName;

      if (courseId && !colorMap.has(courseId)) {
        colorMap.set(courseId, lightColors[colorIndex % lightColors.length]);
        colorIndex++;
      }
    });

    return colorMap;
  }, [assignments]);

  const ReportModal = () => {
    const [selectedCourse, setSelectedCourse] = useState("");
    const [generating, setGenerating] = useState(false);

    const generateReport = async () => {
      setGenerating(true);
      try {
        const response = await fetch("/api/cr/assignments/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semester: crSemester,
            courseId: selectedCourse,
          }),
        });

        if (!response.ok) throw new Error("Failed to generate report");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `assignment-report-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setShowReportModal(false);
      } catch (error) {
        console.error("Error generating report:", error);
        setMessage({ type: "error", text: "Failed to generate report" });
      } finally {
        setGenerating(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Generate Assignment Report
            </h2>
            <button
              onClick={() => setShowReportModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                This will take you to report page showing all students and their
                submission status for all assignments.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/cr/assignments/report">
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg">
                  <FiFileText /> View Report
                </button>
              </Link>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <FaStar className="text-2xl sm:text-3xl text-green-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Assignments
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 ml-0 sm:ml-11">
                View, submit, and manage assignments for {crSemester} Semester
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
              >
                <FiFileText className="text-sm sm:text-base" /> Generate Report
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
              >
                <FiPlus className="text-sm sm:text-base" /> Create Assignment
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center gap-2 text-sm sm:text-base ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "error" && (
              <FiAlertCircle className="text-red-600 flex-shrink-0" />
            )}
            <span className="break-words">{message.text}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Search
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-gray-600 pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="all">All Courses</option>
                {filterCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  fetchAssignments();
                  fetchStudents();
                }}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 text-sm"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />{" "}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200">
              <FiFileText className="text-4xl sm:text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm sm:text-base">
                {loading
                  ? "Loading..."
                  : "No assignments found for your semester"}
              </p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const submissions = assignmentSubmissions[assignment._id] || [];
              const isExpanded = expandedAssignments[assignment._id];
              const isLoadingSubmissions = submissionsLoading[assignment._id];

              return (
                <div
                  key={assignment._id}
                  className={`rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition ${
                    courseColorMap.get(assignment.course?._id) || "bg-white"
                  }`}
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Link
                            href={`/cr/assignments/view/${assignment._id}`}
                            className="flex-shrink-0"
                          >
                            <FaFilePdf className="text-red-500 text-lg sm:text-xl hover:text-red-600 transition-colors" />
                          </Link>
                          <Link
                            href={`/cr/assignments/view/${assignment._id}`}
                            className="text-base sm:text-lg font-semibold text-gray-900 break-words flex-1 hover:text-green-600 transition-colors"
                          >
                            {assignment.title}
                          </Link>
                          {(() => {
                            const status = getSubmissionStatus(
                              assignment.submissionDate,
                            );
                            const statusColors = {
                              orange: "bg-orange-100 text-orange-700",
                              green: "bg-green-100 text-green-700",
                              red: "bg-red-100 text-red-700",
                              gray: "bg-gray-100 text-gray-700",
                            };

                            return (
                              <span
                                className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${statusColors[status.color]}`}
                              >
                                {status.text}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-gray-600 mb-2 text-[12px] sm:text-base break-words">
                          Submission:{" "}
                          {new Date(
                            assignment.submissionDate,
                          ).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            weekday: "long",
                          })}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-500">
                          <span className="break-words">
                            📚{" "}
                            {assignment.course?.courseName
                              ?.split(" ")
                              .slice(0, 3)
                              .join(" ") || "N/A"}
                          </span>
                          {assignment.dueDate && (
                            <span>
                              📅 Due: {formatDateShort(assignment.dueDate)}
                            </span>
                          )}
                          {assignment.chapter && (
                            <span>📖 Ch: {assignment.chapter}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                        {assignment.pdfUrl && (
                          <button
                            onClick={() =>
                              window.open(assignment.pdfUrl, "_blank")
                            }
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition flex-shrink-0"
                            title="Download Assignment"
                          >
                            <FiDownload size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openSubmissionModal(assignment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                          title="Mark Submissions"
                        >
                          <FiUserPlus size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(assignment)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition flex-shrink-0"
                          title="Edit Assignment"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                          title="Delete Assignment"
                        >
                          <FiTrash2 size={16} />
                        </button>
                        <button
                          onClick={() => toggleAssignment(assignment._id)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition flex-shrink-0"
                          title={
                            isExpanded ? "Hide Submissions" : "View Submissions"
                          }
                        >
                          {isExpanded ? (
                            <FiChevronUp size={16} />
                          ) : (
                            <FiChevronDown size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submissions List - Collapsible - Mobile Responsive */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      <div className="p-3 sm:p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                          <FiCheckCircle className="text-green-600" />
                          Student Submissions
                        </h4>
                        {isLoadingSubmissions ? (
                          <div className="text-center py-6 sm:py-8">
                            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2 text-sm">
                              Loading submissions...
                            </p>
                          </div>
                        ) : submissions.length === 0 ? (
                          <p className="text-gray-500 text-center py-4 text-sm">
                            No submissions yet
                          </p>
                        ) : (
                          // Mobile responsive table with horizontal scroll
                          <div className="overflow-x-auto -mx-3 sm:mx-0">
                            <div className="min-w-[500px] sm:min-w-0">
                              <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 sm:px-4 text-gray-600 py-2 text-left">
                                      #
                                    </th>
                                    <th className="px-2 sm:px-4 text-gray-600 py-2 text-left">
                                      Student
                                    </th>
                                    <th className="px-2 sm:px-4 text-gray-600 py-2 text-left">
                                      ID
                                    </th>
                                    <th className="px-2 sm:px-4 text-gray-600 py-2 text-left">
                                      Date
                                    </th>
                                    <th className="px-2 sm:px-4 text-gray-600 py-2 text-left">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {submissions.map((sub, index) => (
                                    <tr
                                      key={sub._id}
                                      className="hover:bg-gray-100 transition"
                                    >
                                      <td className="px-2 sm:px-4 py-2 text-gray-600">
                                        {index + 1}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 font-medium text-gray-900 break-words max-w-[120px] sm:max-w-none">
                                        {sub.studentName || sub.student?.name}
                                        {sub.isCR && (
                                          <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded whitespace-nowrap">
                                            You
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 text-gray-600 text-xs sm:text-sm">
                                        {sub.studentCollegeId ||
                                          sub.student?.collegeId}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                                        {sub.submittedAt
                                          ? formatDateShort(sub.submittedAt)
                                          : "N/A"}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2">
                                        <span
                                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Report Modal */}
        {showReportModal && <ReportModal />}

        {/* Submission Modal - Mobile Responsive */}
        {showSubmissionModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-4">
                  Submit:{" "}
                  {selectedAssignment.title.length > 30
                    ? selectedAssignment.title.substring(0, 30) + "..."
                    : selectedAssignment.title}
                </h2>
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <FiX size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmitAssignment}
                className="p-4 sm:p-6 space-y-4"
              >
                {/* Submission Date */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Submission Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={submissionData.submissionDate}
                    onChange={(e) =>
                      setSubmissionData({
                        ...submissionData,
                        submissionDate: e.target.value,
                      })
                    }
                    required
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select the date when submission was made
                  </p>
                </div>

                {/* Add by College ID */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Add by College ID (comma separated)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="e.g., 521017, 521018, 521019"
                      className="flex-1 text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      onBlur={(e) => {
                        if (e.target.value) {
                          addMultipleStudents(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.target.previousSibling;
                        if (input.value) {
                          addMultipleStudents(input.value);
                          input.value = "";
                        }
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Search and Add Student */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Search and Add Student
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={submissionData.studentInput}
                      onChange={handleStudentInputChange}
                      placeholder="Search by name or college ID..."
                      className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    {studentSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                        {studentSuggestions.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => addStudent(student)}
                            className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 flex justify-between items-center text-sm"
                          >
                            <span className="text-gray-600 break-words flex-1">
                              {student.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {student.collegeId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Students List */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Selected Students ({submissionData.studentIds.length})
                  </label>
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {submissionData.studentIds.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-sm">
                        No students selected
                      </p>
                    ) : (
                      submissionData.studentIds.map((studentId) => {
                        const student = students.find(
                          (s) => s._id === studentId,
                        );
                        if (!student) return null;
                        return (
                          <div
                            key={studentId}
                            className="flex justify-between items-center p-3 border-b border-gray-100 hover:bg-gray-50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm break-words">
                                {student.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                ID: {student.collegeId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStudent(studentId)}
                              className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-yellow-800 flex items-center gap-2">
                    <FiAlertCircle className="flex-shrink-0" />
                    <span>
                      {
                        "Submissions will be marked as 'Late' if the submission date is after the due date."
                      }
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={
                      uploading || submissionData.studentIds.length === 0
                    }
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <FaUserCheck size={14} />
                    {uploading
                      ? "Submitting..."
                      : `Submit for ${submissionData.studentIds.length} Student(s)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubmissionModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create/Edit Assignment Modal - Mobile Responsive */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {isEditing ? "Edit Assignment" : "Create New Assignment"}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={20} />
                </button>
              </div>

              <form
                onSubmit={handleCreateAssignment}
                className="p-4 sm:p-6 space-y-4"
              >
                {/* Title */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Course *
                  </label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseName} ({course.courseCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Chapter
                  </label>
                  <input
                    type="text"
                    name="chapter"
                    value={formData.chapter}
                    onChange={handleInputChange}
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                {/* Semester (Read-only) */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={formData.semester}
                    disabled
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                </div>

                {/* Submission Date and Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                      Submission Date
                    </label>
                    <input
                      type="date"
                      name="submissionDate"
                      value={formData.submissionDate}
                      onChange={handleInputChange}
                      className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Instructions
                  </label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>

                {/* Resources */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Resources / Materials
                  </label>
                  <div className="space-y-3">
                    {formData.resources.map((resource, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Resource title (e.g., Reference Book)"
                            value={resource.title}
                            onChange={(e) =>
                              updateResource(index, "title", e.target.value)
                            }
                            className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                          />
                          <input
                            type="url"
                            placeholder="Resource URL or link"
                            value={resource.url}
                            onChange={(e) =>
                              updateResource(index, "url", e.target.value)
                            }
                            className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                          />
                        </div>
                        {formData.resources.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeResource(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addResource}
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                    >
                      <FiPlus size={14} /> Add Resource
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Add study materials, reference links, or additional
                    resources for students
                  </p>
                </div>

                {/* PDF File Upload */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    PDF File (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full text-gray-600 text-sm"
                  />
                  {isEditing && (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to keep existing file
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum file size: 10MB. Only PDF files are allowed.
                  </p>
                </div>

                {/* Message Display */}
                {message.text && (
                  <div
                    className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center gap-2 text-sm sm:text-base ${
                      message.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {message.type === "error" && (
                      <FiAlertCircle className="text-red-600 flex-shrink-0" />
                    )}
                    <span className="break-words">{message.text}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <FiSave />
                    {uploading
                      ? "Processing..."
                      : isEditing
                        ? "Update Assignment"
                        : "Create Assignment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition text-sm sm:text-base"
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

export default CRAssignmentsPage;
