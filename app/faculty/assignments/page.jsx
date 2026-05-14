// app/faculty/assignments/page.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiSearch,
  FiRefreshCw,
  FiFileText,
  FiDownload,
  FiUsers,
  FiAlertCircle,
  FiUserPlus,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { FaChalkboardTeacher, FaFilePdf, FaUserCheck } from "react-icons/fa";
import Link from "next/link";

const FacultyAssignmentsPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Expanded assignments for viewing submissions
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

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    chapter: "",
    semester: "1st",
    course: "",
    submissionDate: "",
    dueDate: "",
    instructions: "",
    resources: [{ title: "", url: "" }],
    pdfFile: null,
  });

  const semesters = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  // Helper function to show error messages
  const showError = (error) => {
    console.error("Error:", error);
    setMessage({
      type: "error",
      text: error.message || "An unexpected error occurred",
    });
  };

  // Fetch students for selected semester
  const fetchStudents = async (semester) => {
    if (!semester || semester === "all") return;

    try {
      const response = await fetch(
        `/api/faculty/get-students?semester=${semester}`,
      );
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      if (data.success) {
        console.log(
          `Loaded ${data.data.length} students for ${semester} semester`,
        );
        setStudents(data.data);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage({ type: "error", text: "Failed to load students" });
    }
  };

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

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, assignmentsRes] = await Promise.all([
        fetch("/api/faculty/courses"),
        fetch("/api/faculty/assignments"),
      ]);

      if (!coursesRes.ok) throw new Error("Failed to fetch courses");
      if (!assignmentsRes.ok) throw new Error("Failed to fetch assignments");

      const coursesData = await coursesRes.json();
      const assignmentsData = await assignmentsRes.json();

      if (coursesData.success) setCourses(coursesData.data);
      if (assignmentsData.success) setAssignments(assignmentsData.data);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    //eslint-disable-next-line
    fetchData();
    //eslint-disable-next-line
  }, []);

  // Fetch students when semester filter changes
  useEffect(() => {
    if (selectedSemester !== "all") {
      //eslint-disable-next-line
      fetchStudents(selectedSemester);
    } else {
      setStudents([]);
    }
  }, [selectedSemester]);

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester =
      selectedSemester === "all" || assignment.semester === selectedSemester;
    const matchesCourse =
      selectedCourse === "all" || assignment.course?._id === selectedCourse;
    return matchesSearch && matchesSemester && matchesCourse;
  });

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
    setMessage({ type: "", text: "" });
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

  const openAddModal = () => {
    setIsEditing(false);
    setEditingAssignment(null);
    setFormData({
      title: "",
      description: "",
      chapter: "",
      semester: "1st",
      course: "",
      submissionDate: "",
      dueDate: "",
      instructions: "",
      resources: [{ title: "", url: "" }],
      pdfFile: null,
    });
    setIsModalOpen(true);
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
    setIsModalOpen(true);
  };

  // Replace your existing openSubmissionModal function with this
  const openSubmissionModal = async (assignment) => {
    setSelectedAssignment(assignment);

    // Ensure students are loaded for this assignment's semester
    if (selectedSemester !== assignment.semester) {
      setSelectedSemester(assignment.semester);
      await fetchStudents(assignment.semester);
    } else if (students.length === 0) {
      await fetchStudents(assignment.semester);
    }

    await fetchSubmissionsForAssignment(assignment._id);

    // Get current date in GMT+6 (Bangladesh Time)
    const getCurrentBangladeshTime = () => {
      const now = new Date();
      // Get UTC time
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      // Add 6 hours for GMT+6
      const bangladeshTime = new Date(utcTime + 6 * 3600000);

      // Format to YYYY-MM-DDThh:mm for datetime-local input
      const year = bangladeshTime.getFullYear();
      const month = String(bangladeshTime.getMonth() + 1).padStart(2, "0");
      const day = String(bangladeshTime.getDate()).padStart(2, "0");
      const hours = String(bangladeshTime.getHours()).padStart(2, "0");
      const minutes = String(bangladeshTime.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setSubmissionData({
      studentIds: [],
      studentInput: "",
      submissionDate: getCurrentBangladeshTime(),
    });
    setShowSubmissionModal(true);
  };

  // Search students by college ID or name
  const handleStudentInputChange = (e) => {
    const value = e.target.value;
    setSubmissionData({ ...submissionData, studentInput: value });

    if (value.length > 1) {
      const filtered = students.filter(
        (s) =>
          (s.collegeId &&
            s.collegeId.toLowerCase().includes(value.toLowerCase())) ||
          (s.name && s.name.toLowerCase().includes(value.toLowerCase())),
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
    const ids = collegeIdsString
      .split(/[,\s\n]+/)
      .filter((id) => id.trim().length > 0);

    console.log("Parsed college IDs:", ids);
    console.log("Available students:", students.length);

    const newStudentIds = [...submissionData.studentIds];
    const notFoundIds = [];

    ids.forEach((collegeId) => {
      const student = students.find(
        (s) =>
          s.collegeId &&
          s.collegeId.toString().trim() === collegeId.toString().trim(),
      );

      if (student && !newStudentIds.includes(student._id)) {
        console.log("Found student:", student.name, student.collegeId);
        newStudentIds.push(student._id);
      } else if (!student) {
        notFoundIds.push(collegeId);
      }
    });

    if (notFoundIds.length > 0) {
      setMessage({
        type: "error",
        text: `Student(s) not found with college ID: ${notFoundIds.join(", ")}`,
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

    if (!submissionData.submissionDate) {
      setMessage({ type: "error", text: "Please select submission date" });
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
        // Refresh assignments to update totalSubmissions count
        fetchData();

        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setUploading(false);
    }
  };

  // Validate file before upload
  const validateFile = (file) => {
    if (!file) return { valid: false, message: "No file selected" };

    const maxSize = 10 * 1024 * 1024; // 10MB
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

  // Upload file to Cloudinary with retry logic
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

  const handleSubmit = async (e) => {
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
        if (!uploadResult.success) {
          throw new Error(uploadResult.message);
        }
        pdfData = {
          pdfUrl: uploadResult.url,
          pdfPublicId: uploadResult.publicId,
          pdfFileName: uploadResult.fileName,
          pdfFileSize: uploadResult.fileSize,
        };
      } else if (!isEditing) {
        throw new Error("Please upload a PDF file");
      }

      const url = isEditing
        ? "/api/faculty/assignments/update"
        : "/api/faculty/assignments/create";
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
        resources: formData.resources.filter((r) => r.title || r.url),
        teacher: user?.id,
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
        setIsModalOpen(false);
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message || "Operation failed");
      }
    } catch (error) {
      showError(error);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "⚠️ Are you sure? All student submissions will be permanently deleted!",
      )
    )
      return;

    setLoading(true);
    try {
      const response = await fetch("/api/faculty/assignments/delete", {
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
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateShort = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getSubmissionStatus = (submissionDate, dueDate) => {
    if (!submissionDate) return { text: "No Date", color: "gray" };

    const subDate = new Date(submissionDate);
    subDate.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (subDate <= due) {
      return { text: "On Time", color: "green" };
    } else {
      return { text: "Late", color: "red" };
    }
  };

  // Delete a single submission
  const handleDeleteSubmission = async (submissionId, assignmentId) => {
    if (
      !confirm(
        "⚠️ Are you sure you want to delete this submission? This action cannot be undone!",
      )
    ) {
      return;
    }

    setSubmissionsLoading((prev) => ({ ...prev, [assignmentId]: true }));

    try {
      const response = await fetch(
        `/api/faculty/assignments/submissions/delete?id=${submissionId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Submission deleted successfully!",
        });

        // Refresh submissions for this assignment
        await fetchSubmissionsForAssignment(assignmentId);

        // Refresh assignments to update totalSubmissions count
        fetchData();

        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } finally {
      setSubmissionsLoading((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaChalkboardTeacher className="text-3xl text-purple-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Assignment Management
                </h1>
              </div>
              <p className="text-gray-600 ml-11">
                Create and manage assignments for all semesters
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={"/faculty/assignments/report"}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition"
              >
                <FiFileText /> Show Report
              </Link>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white cursor-pointer rounded-lg hover:bg-purple-700 transition"
              >
                <FiPlus /> Create Assignment
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
            {message.type === "error" && (
              <FiAlertCircle className="text-red-600" />
            )}
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by title or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Semesters</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} Semester
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseName} ({course.courseCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
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
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <FiFileText className="text-5xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {loading ? "Loading..." : "No assignments found"}
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
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <FaFilePdf className="text-red-500 text-xl" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.title}
                          </h3>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {assignment.semester} Semester
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {assignment.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span>
                            📚 Course:{" "}
                            {assignment.course?.courseName ||
                              assignment.courseName}
                          </span>
                          <span>
                            📅 Due: {formatDateShort(assignment.submissionDate)}
                          </span>
                          <span>
                            📝 Submissions: {assignment.totalSubmissions || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openSubmissionModal(assignment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Mark Submissions"
                        >
                          <FiUserPlus size={18} />
                        </button>
                        <button
                          onClick={() =>
                            window.open(assignment.pdfUrl, "_blank")
                          }
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Download PDF"
                        >
                          <FiDownload size={18} />
                        </button>
                        <button
                          onClick={() => openEditModal(assignment)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <FiTrash2 size={18} />
                        </button>
                        <button
                          onClick={() => toggleAssignment(assignment._id)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                          title={
                            isExpanded ? "Hide Submissions" : "View Submissions"
                          }
                        >
                          {isExpanded ? (
                            <FiChevronUp size={18} />
                          ) : (
                            <FiChevronDown size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submissions List - Collapsible */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <FiUsers className="text-blue-600" />
                          Student Submissions ({submissions.length})
                        </h4>
                        {isLoadingSubmissions ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-gray-500 mt-2">
                              Loading submissions...
                            </p>
                          </div>
                        ) : submissions.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            No submissions yet
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-gray-600">
                                    #
                                  </th>
                                  <th className="px-4 py-2 text-left text-gray-600">
                                    Student
                                  </th>
                                  <th className="px-4 py-2 text-left text-gray-600">
                                    College ID
                                  </th>
                                  <th className="px-4 py-2 text-left text-gray-600">
                                    Submitted At
                                  </th>
                                  <th className="px-4 py-2 text-left text-gray-600">
                                    Status
                                  </th>
                                  <th className="px-4 py-2 text-left text-gray-600">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {submissions.map((sub, index) => {
                                  const status = getSubmissionStatus(
                                    sub.submittedAt,
                                    assignment.submissionDate,
                                  );
                                  return (
                                    <tr
                                      key={sub._id}
                                      className="border-t hover:bg-gray-100"
                                    >
                                      <td className="px-4 py-2 text-gray-600">
                                        {index + 1}
                                      </td>
                                      <td className="px-4 py-2 text-gray-900 font-medium">
                                        {sub.studentName || sub.student?.name}
                                      </td>
                                      <td className="px-4 py-2 text-gray-600">
                                        {sub.studentCollegeId ||
                                          sub.student?.collegeId}
                                      </td>
                                      <td className="px-4 py-2 text-gray-600">
                                        {sub.submittedAt
                                          ? new Date(
                                              sub.submittedAt,
                                            ).toLocaleString("en-GB")
                                          : "N/A"}
                                      </td>
                                      <td className="px-4 py-2">
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            status.color === "green"
                                              ? "bg-green-100 text-green-700"
                                              : status.color === "red"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-gray-100 text-gray-700"
                                          }`}
                                        >
                                          {status.text}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <button
                                          onClick={() =>
                                            handleDeleteSubmission(
                                              sub._id,
                                              assignment._id,
                                            )
                                          }
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                          title="Delete Submission"
                                          disabled={
                                            submissionsLoading[assignment._id]
                                          }
                                        >
                                          <FiTrash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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

        {/* Submission Modal */}
        {showSubmissionModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-4">
                  Submit: {selectedAssignment.title}
                </h2>
                <button
                  onClick={() => setShowSubmissionModal(false)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form
                onSubmit={handleSubmitAssignment}
                className="p-4 sm:p-6 space-y-4"
              >
                {/* Submission Date */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium text-sm sm:text-base">
                    Submission Date <span className="text-red-500">*</span>
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
                    className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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
                      id="collegeIdsInput"
                      placeholder="e.g., 521017, 521018, 521019"
                      className="flex-1 text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input = e.target;
                          if (input.value) {
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
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                    >
                      Add Students
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter college IDs separated by commas, spaces, or new lines
                  </p>
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
                      className="w-full text-gray-600 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    {studentSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                        {studentSuggestions.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => addStudent(student)}
                            className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 flex justify-between items-center text-sm border-b last:border-b-0"
                          >
                            <span className="text-gray-700 font-medium">
                              {student.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {student.collegeId}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Type name or college ID to search
                  </p>
                </div>

                {/* Students Count */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{students.length}</strong> students available for{" "}
                    {selectedAssignment.semester} semester{" "}
                  </p>
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
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {student.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                College ID: {student.collegeId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStudent(studentId)}
                              className="text-red-500 hover:text-red-700 ml-2 p-1 hover:bg-red-50 rounded transition"
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
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <FaUserCheck size={16} />
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

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? "Edit Assignment" : "Create New Assignment"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter assignment title"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Chapter
                    </label>
                    <input
                      type="text"
                      name="chapter"
                      value={formData.chapter}
                      onChange={handleInputChange}
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Chapter number or name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe the assignment requirements"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      required
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {semesters.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem} Semester
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      required
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Course</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.courseName} ({course.courseCode}) -{" "}
                          {course.semester} Sem
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Submission Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="submissionDate"
                      value={formData.submissionDate}
                      onChange={handleInputChange}
                      required
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Instructions (Optional)
                  </label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional instructions for students"
                  />
                </div>

                {/* Resources Section */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Resources / Materials
                  </label>
                  <div className="space-y-3">
                    {formData.resources.map((resource, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Resource title"
                            value={resource.title}
                            onChange={(e) =>
                              updateResource(index, "title", e.target.value)
                            }
                            className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                          <input
                            type="url"
                            placeholder="Resource URL"
                            value={resource.url}
                            onChange={(e) =>
                              updateResource(index, "url", e.target.value)
                            }
                            className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                    >
                      <FiPlus size={14} /> Add Resource
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    PDF File{" "}
                    {!isEditing && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required={!isEditing}
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  {isEditing && (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to keep current PDF
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum file size: 10MB. Only PDF files are allowed.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiSave className="inline" />
                    {uploading
                      ? "Uploading..."
                      : isEditing
                        ? "Update Assignment"
                        : "Create Assignment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
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

export default FacultyAssignmentsPage;
