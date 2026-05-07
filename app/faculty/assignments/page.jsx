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
} from "react-icons/fi";
import { FaChalkboardTeacher, FaFilePdf } from "react-icons/fa";

const FacultyAssignmentsPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmissions, setShowSubmissions] = useState(false);

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

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i)),
        );
      }
    }
    return { success: false, message: "Upload failed" };
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

  // Fetch submissions for an assignment
  const fetchSubmissions = async (assignmentId) => {
    try {
      const response = await fetch(
        `/api/faculty/assignments/submissions?assignmentId=${assignmentId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch submissions");

      const data = await response.json();
      if (data.success) setSubmissions(data.data);
    } catch (error) {
      showError(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      pdfFile: null,
    });
    setIsModalOpen(true);
  };

  const viewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    await fetchSubmissions(assignment._id);
    setShowSubmissions(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      // Validate required fields
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
      } else {
        throw new Error(data.message || "Operation failed");
      }
    } catch (error) {
      showError(error);
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
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
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
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <FiPlus /> Create Assignment
            </button>
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
              <p className="text-gray-500">No assignments found</p>
            </div>
          ) : (
            filteredAssignments.map((assignment) => (
              <div
                key={assignment._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FaFilePdf className="text-red-500 text-xl" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.title}
                      </h3>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {assignment.semester} Semester
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">
                      {assignment.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>
                        📚 Course:{" "}
                        {assignment.course?.courseName || assignment.courseName}
                      </span>
                      <span>
                        📅 Due:{" "}
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleDateString()
                          : "Not set"}
                      </span>
                      <span>
                        📝 Submissions: {assignment.totalSubmissions || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewSubmissions(assignment)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="View Submissions"
                    >
                      <FiUsers size={18} />
                    </button>
                    <button
                      onClick={() => window.open(assignment.pdfUrl, "_blank")}
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
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Submissions Modal */}
        {showSubmissions && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Submissions: {selectedAssignment.title}
                </h2>
                <button
                  onClick={() => setShowSubmissions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="p-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 text-gray-600 py-2 text-left">Student</th>
                      <th className="px-4 text-gray-600 py-2 text-left">College ID</th>
                      <th className="px-4 text-gray-600 py-2 text-left">Submitted At</th>
                      <th className="px-4 text-gray-600 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-8 text-gray-500"
                        >
                          No submissions yet
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub._id} className="border-t">
                          <td className="px-4 py-2 text-gray-600">
                            {sub.studentName || sub.student?.name}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {sub.studentCollegeId || sub.student?.collegeId}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleString()
                              : "N/A"}
                          </td>
                          <td className="px-4 py-2 text-gray-600 ">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                sub.status === "onTime"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {sub.status === "onTime" ? "On Time" : "Late"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
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
                      Title *
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
                    Description *
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
                      Semester *
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
                      Course *
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
                      Available From
                    </label>
                    <input
                      type="date"
                      name="submissionDate"
                      value={formData.submissionDate}
                      onChange={handleInputChange}
                      className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
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

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    PDF File {!isEditing && "*"}
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
                    <span className="text-sm">{message.text}</span>
                  </div>
                )}

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
