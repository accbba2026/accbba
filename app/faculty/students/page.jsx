// app/faculty/students/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiUserPlus,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiCheckSquare,
  FiSquare,
  FiSearch,
  FiEdit2,
  FiX,
  FiSave,
  FiPhone,
  FiMail,
  FiLock,
} from "react-icons/fi";
import { IoCalendarOutline } from "react-icons/io5";
import { FaGraduationCap, FaUserGraduate } from "react-icons/fa";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdDelete } from "react-icons/md";

export default function StudentManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [semesterStats, setSemesterStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    collegeId: "",
    phone: "",
    email: "",
    semester: "1st",
    session: "2024-25",
    status: "active",
    role: "student",
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkSemester, setBulkSemester] = useState("");
  const [bulkSession, setBulkSession] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [studentFetchLoad, setStudentFetchLoad] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("name");

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    collegeId: "",
    phone: "",
    email: "",
    password: "", // Add password field
    semester: "",
    session: "",
    status: "",
    role: "",
  });

  // Collapsible sections state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isBulkOperationsOpen, setIsBulkOperationsOpen] = useState(false);

  const [deletingStudentId, setDeletingStudentId] = useState(null);

  const handleDeleteStudent = async (studentId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this student? This action cannot be undone.",
    );

    if (!isConfirmed) return;

    setDeletingStudentId(studentId); // Start specific loading state

    try {
      const response = await fetch("/api/user/delete-student", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId }),
      });

      const data = await response.json();

      if (data.success) {
        window.alert("Student deleted successfully!");
        fetchStudents();
        fetchSemesterStats();
      } else {
        window.alert(data.message || "Failed to delete student.");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      window.alert("An error occurred while trying to delete the student.");
    } finally {
      setDeletingStudentId(null); // Stop specific loading state
    }
  };

  // Fetch students on load
  useEffect(() => {
    //eslint-disable-next-line
    fetchStudents();
    //eslint-disable-next-line
    fetchSemesterStats();
  }, []);

  const fetchStudents = async () => {
    try {
      setStudentFetchLoad(true);
      const response = await fetch("/api/user/get-students");
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setStudentFetchLoad(false);
    }
  };

  const fetchSemesterStats = async () => {
    try {
      const response = await fetch(
        "/api/user/bulk-update-semester?action=stats",
      );
      const data = await response.json();
      if (data.success) {
        setSemesterStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter((student) => {
    if (!searchTerm) return true;

    if (searchType === "name") {
      return student.name.toLowerCase().includes(searchTerm.toLowerCase());
    } else if (searchType === "collegeId") {
      return student.collegeId.toString().includes(searchTerm);
    } else if (searchType === "phone") {
      return student.phone && student.phone.includes(searchTerm);
    } else if (searchType === "email") {
      return (
        student.email &&
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  // Group filtered students by semester
  const studentsBySemester = filteredStudents.reduce((acc, student) => {
    const semester = student.semester;
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(student);
    return acc;
  }, {});

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/user/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Student added successfully!" });
        setFormData({
          name: "",
          collegeId: "",
          phone: "",
          email: "",
          status: "active",
          role: "student",
        });
        fetchStudents();
        fetchSemesterStats();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to add student",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal with student data
  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      collegeId: student.collegeId,
      phone: student.phone || "",
      email: student.email || "",
      semester: student.semester,
      session: student.session || "2024-25",
      status: student.status,
      role: student.role,
    });
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
    setEditFormData({
      name: "",
      collegeId: "",
      phone: "",
      email: "",
      semester: "",
      session: "",
      status: "",
      role: "",
    });
  };

  // Handle edit form input changes
  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // Save edited student - Add this validation before API call
  const handleSaveEdit = async () => {
    // Client-side validation for CR role
    if (editFormData.role === "cr") {
      if (!editFormData.email || !editFormData.email.trim()) {
        setMessage({
          type: "error",
          text: "Email is required for Class Representative (CR) role",
        });
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(editFormData.email)) {
        setMessage({
          type: "error",
          text: "Please enter a valid email address for CR",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/update-student", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStudent._id,
          name: editFormData.name,
          phone: editFormData.phone,
          email: editFormData.email,
          password: editFormData.password, // Include password
          semester: editFormData.semester,
          session: editFormData.session,
          status: editFormData.status,
          role: editFormData.role,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const successMessage = data.passwordSent
          ? "Student updated successfully! Credentials have been sent to their email."
          : "Student updated successfully!";
        setMessage({ type: "success", text: successMessage });
        closeEditModal();
        fetchStudents();
        fetchSemesterStats();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update student",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSemesterUpdate = async () => {
    if (!bulkSemester) {
      setMessage({ type: "error", text: "Please select a semester" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/bulk-update-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSemester: bulkSemester,
          studentIds: selectedStudents,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setSelectedStudents([]);
        setBulkSemester("");
        fetchStudents();
        fetchSemesterStats();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSessionUpdate = async () => {
    if (!bulkSession) {
      setMessage({ type: "error", text: "Please select a session" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/bulk-update-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSession: bulkSession,
          studentIds: selectedStudents,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setSelectedStudents([]);
        setBulkSession("");
        fetchStudents();
        fetchSemesterStats();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
  };

  const semesterOrder = [
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "graduated",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FaUserGraduate className="text-3xl text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Student Management
            </h1>
          </div>
          <p className="text-gray-600 ml-11">
            Manage students, update semesters, and track academic progress
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Add Student Form - Collapsible */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <FiUserPlus className="text-xl text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Add New Student
              </h2>
            </div>
            {isAddFormOpen ? (
              <FiChevronUp className="text-gray-500" />
            ) : (
              <FiChevronDown className="text-gray-500" />
            )}
          </button>

          {isAddFormOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="Enter student name"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">
                      College ID (6 digits) *
                    </label>
                    <input
                      type="text"
                      name="collegeId"
                      value={formData.collegeId}
                      onChange={handleInputChange}
                      required
                      pattern="\d{6}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="Enter 6-digit ID"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                      <FiPhone className="text-gray-500" />
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      pattern="01[3-9]\d{8}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="e.g., 017xxxxxxxx"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Bangladeshi number: 01XXXXXXXXX
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                      <FiMail className="text-gray-500" />
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="student@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">
                      Semester
                    </label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    >
                      <option value="1st">1st Semester</option>
                      <option value="2nd">2nd Semester</option>
                      <option value="3rd">3rd Semester</option>
                      <option value="4th">4th Semester</option>
                      <option value="5th">5th Semester</option>
                      <option value="6th">6th Semester</option>
                      <option value="7th">7th Semester</option>
                      <option value="8th">8th Semester</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">
                      Session
                    </label>
                    <input
                      type="text"
                      name="session"
                      value={formData.session}
                      onChange={handleInputChange}
                      required
                      pattern="\d{4}-\d{2,4}"
                      placeholder="e.g., 2021-22 or 2021-2022"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format: YYYY-YY or YYYY-YYYY (e.g., 2021-22 or 2021-2022)
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <FiUserPlus />
                  {loading ? "Adding..." : "Add Student"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bulk Operations - Collapsible */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => setIsBulkOperationsOpen(!isBulkOperationsOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <HiOutlineUserGroup className="text-xl text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Bulk Operations
              </h2>
              {selectedStudents.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                  {selectedStudents.length} selected
                </span>
              )}
            </div>
            {isBulkOperationsOpen ? (
              <FiChevronUp className="text-gray-500" />
            ) : (
              <FiChevronDown className="text-gray-500" />
            )}
          </button>

          {isBulkOperationsOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    Update Semester
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={bulkSemester}
                      onChange={(e) => setBulkSemester(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                    >
                      <option value="">Select Semester</option>
                      <option value="1st">1st Semester</option>
                      <option value="2nd">2nd Semester</option>
                      <option value="3rd">3rd Semester</option>
                      <option value="4th">4th Semester</option>
                      <option value="5th">5th Semester</option>
                      <option value="6th">6th Semester</option>
                      <option value="7th">7th Semester</option>
                      <option value="8th">8th Semester</option>
                      <option value="graduated">Graduated</option>
                    </select>
                    <button
                      onClick={handleBulkSemesterUpdate}
                      disabled={loading || selectedStudents.length === 0}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <IoCalendarOutline className="text-green-600" />
                    Update Session
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bulkSession}
                      onChange={(e) => setBulkSession(e.target.value)}
                      placeholder="e.g., 2021-22 or 2021-2022"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
                    />
                    <button
                      onClick={handleBulkSessionUpdate}
                      disabled={loading || selectedStudents.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>

              {selectedStudents.length > 0 && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-700">
                    {selectedStudents.length} student(s) selected for bulk
                    update
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Semester Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FaGraduationCap className="text-xl text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Semester Statistics
              </h2>
            </div>
            <button
              onClick={() => {
                fetchStudents();
                fetchSemesterStats();
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {semesterStats.map((stat) => (
              <div
                key={stat._id}
                className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition"
              >
                <p className="text-2xl font-bold text-blue-600">{stat.count}</p>
                <p className="text-gray-600 text-sm">
                  {stat._id === "graduated"
                    ? "🎓 Graduated"
                    : `${stat._id} Sem`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Search by
              </label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="name">Name</option>
                <option value="collegeId">College ID</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div className="flex-[3]">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Search Term
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search by ${searchType}...`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Select All Button */}
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Students List{" "}
            {searchTerm && `(Search results: ${filteredStudents.length})`}
          </h2>
          <button
            onClick={selectAllStudents}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition"
          >
            {selectedStudents.length === filteredStudents.length &&
            filteredStudents.length > 0 ? (
              <>
                <FiCheckSquare /> Deselect All
              </>
            ) : (
              <>
                <FiSquare /> Select All
              </>
            )}
          </button>
        </div>
        {/* Semester-wise Students Lists */}
        <div className="space-y-6">
          {semesterOrder.map((semester) => {
            const semesterStudents = studentsBySemester[semester] || [];
            if (semesterStudents.length === 0) return null;

            return (
              <div
                key={semester}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {semester === "graduated"
                      ? "🎓 Graduated Students"
                      : `${semester} Semester`}
                    <span className="ml-2 text-sm text-gray-500 font-normal">
                      ({semesterStudents.length} students)
                    </span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white border-b border-gray-200">
                      <tr className="text-gray-600 text-sm">
                        <th className="px-4 py-3 text-left w-12">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds = semesterStudents.map(
                                  (s) => s._id,
                                );
                                setSelectedStudents([
                                  ...new Set([...selectedStudents, ...allIds]),
                                ]);
                              } else {
                                const semesterIds = semesterStudents.map(
                                  (s) => s._id,
                                );
                                setSelectedStudents(
                                  selectedStudents.filter(
                                    (id) => !semesterIds.includes(id),
                                  ),
                                );
                              }
                            }}
                            checked={
                              semesterStudents.length > 0 &&
                              semesterStudents.every((s) =>
                                selectedStudents.includes(s._id),
                              )
                            }
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">College ID</th>
                        <th className="px-4 py-3 text-left">Phone</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Session</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {semesterStudents.map((student) => (
                        <tr
                          key={student._id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student._id)}
                              onChange={() =>
                                toggleStudentSelection(student._id)
                              }
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">
                            {student.collegeId}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.phone || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.email || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.session || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                student.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : student.status === "graduated"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {student.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 capitalize text-gray-600">
                            {student.role}
                          </td>
                          <td className="flex px-4 py-3">
                            <button
                              onClick={() => openEditModal(student)}
                              className="text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                            >
                              <FiEdit2 /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student._id)}
                              disabled={deletingStudentId === student._id}
                              className="ml-4 text-red-600 hover:text-red-800 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {user?.role === "admin" ? (
                                deletingStudentId === student._id ? (
                                  <>
                                    <FiRefreshCw className="animate-spin" />{" "}
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <MdDelete /> Delete
                                  </>
                                )
                              ) : null}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FaUserGraduate className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchTerm
                ? "No students match your search."
                : studentFetchLoad
                  ? "Loading..."
                  : "No students found. Add your first student!"}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Student
              </h2>
              {/* Message Display */}
              {message.text && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    College ID
                  </label>
                  <input
                    type="text"
                    name="collegeId"
                    value={editFormData.collegeId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    College ID cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiPhone className="text-gray-500" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditInputChange}
                    pattern="01[3-9]\d{8}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="e.g., 017xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiMail className="text-gray-500" />
                    Email{" "}
                    {editFormData.role === "cr" && (
                      <span className="text-red-500 text-xs">
                        *Required for CR
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
                      editFormData.role === "cr" && !editFormData.email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="student@example.com"
                    required={editFormData.role === "cr"}
                  />
                  {editFormData.role === "cr" && !editFormData.email && (
                    <p className="text-xs text-red-500 mt-1">
                      Email is required for Class Representative
                    </p>
                  )}
                </div>

                {editFormData.role === "cr" && (
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                      <FiLock className="text-gray-500" />
                      Password{" "}
                      {!editingStudent?.password && (
                        <span className="text-red-500 text-xs">
                          *Auto-generated if empty
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="password"
                      value={editFormData.password}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      placeholder="Leave empty to auto-generate"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If left empty, a random password will be generated and
                      sent via email.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Semester
                  </label>
                  <select
                    name="semester"
                    value={editFormData.semester}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                    <option value="3rd">3rd Semester</option>
                    <option value="4th">4th Semester</option>
                    <option value="5th">5th Semester</option>
                    <option value="6th">6th Semester</option>
                    <option value="7th">7th Semester</option>
                    <option value="8th">8th Semester</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Session
                  </label>
                  <input
                    type="text"
                    name="session"
                    value={editFormData.session}
                    onChange={handleEditInputChange}
                    pattern="\d{4}-\d{2,4}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="e.g., 2021-22 or 2021-2022"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Status
                  </label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Role
                  </label>
                  <select
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="student">Student</option>
                    <option value="cr">Class Representative</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium flex items-center gap-2"
              >
                <FiSave />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
