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
  FiPrinter,
  FiDroplet,
} from "react-icons/fi";
import { IoCalendarOutline } from "react-icons/io5";
import { FaGraduationCap, FaUserGraduate } from "react-icons/fa";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEMESTER_ORDER = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "graduated",
  "unassigned",
];

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
    bloodGroup: "",
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
    password: "",
    bloodGroup: "",
    semester: "",
    session: "",
    status: "",
    role: "",
  });

  // Collapsible sections
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isBulkOperationsOpen, setIsBulkOperationsOpen] = useState(false);

  // ✅ Semester collapse state — empty object means ALL collapsed by default
  const [openSemesters, setOpenSemesters] = useState({});

  const [deletingStudentId, setDeletingStudentId] = useState(null);

const handleDeleteStudent = async (studentId) => {
  // Confirm dialog via toast
  const confirmed = await new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-white">
            Delete this student? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: 10000, position: 'top-center' }
    );
  });

  if (!confirmed) return;

  setDeletingStudentId(studentId);
  const toastId = toast.loading('Deleting student...');

  try {
    const response = await fetch('/api/user/delete-student', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: studentId }),
    });
    const data = await response.json();

    if (data.success) {
      toast.success('Student deleted successfully!', { id: toastId });
      fetchStudents();
      fetchSemesterStats();
    } else {
      toast.error(data.message || 'Failed to delete student.', { id: toastId });
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    toast.error('An error occurred while deleting the student.', { id: toastId });
  } finally {
    setDeletingStudentId(null);
  }
};

  useEffect(() => {
    fetchStudents();
    fetchSemesterStats();
  }, []);

  const fetchStudents = async () => {
    try {
      setStudentFetchLoad(true);
      const response = await fetch("/api/user/get-students");
      const data = await response.json();
      if (data.success) setStudents(data.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setStudentFetchLoad(false);
    }
  };

  const fetchSemesterStats = async () => {
    try {
      const response = await fetch("/api/user/bulk-update-semester?action=stats");
      const data = await response.json();
      if (data.success) setSemesterStats(data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    if (searchType === "name") return student.name.toLowerCase().includes(term);
    if (searchType === "collegeId")
      return student.collegeId?.toString().includes(searchTerm);
    if (searchType === "phone")
      return student.phone && student.phone.includes(searchTerm);
    if (searchType === "email")
      return student.email && student.email.toLowerCase().includes(term);
    if (searchType === "bloodGroup")
      return student.bloodGroup && student.bloodGroup.toLowerCase() === term;
    return true;
  });

  const studentsBySemester = filteredStudents.reduce((acc, student) => {
    const semester = student.semester || "unassigned";
    if (!acc[semester]) acc[semester] = [];
    acc[semester].push(student);
    return acc;
  }, {});

  // ✅ Toggle a semester open/closed
  const toggleSemester = (semester) => {
    setOpenSemesters((prev) => ({
      ...prev,
      [semester]: !prev[semester],
    }));
  };

  // ✅ Expand all / Collapse all
  const expandAll = () => {
    const all = {};
    Object.keys(studentsBySemester).forEach((s) => (all[s] = true));
    setOpenSemesters(all);
  };
  const collapseAll = () => setOpenSemesters({});

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
       toast.success('Student added successfully!');
        setFormData({
          name: "",
          collegeId: "",
          phone: "",
          email: "",
          bloodGroup: "",
          semester: "1st",
          session: "2024-25",
          status: "active",
          role: "student",
        });
        fetchStudents();
        fetchSemesterStats();
      } else {
       toast.error(data.message || 'Failed to add student');
      }
    } catch (error) {
      toast.error('An error occurred while adding the student.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      collegeId: student.collegeId,
      phone: student.phone || "",
      email: student.email || "",
      password: "",
      bloodGroup: student.bloodGroup || "",
      semester: student.semester || "",
      session: student.session || "2024-25",
      status: student.status || "active",
      role: student.role || "student",
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
    setEditFormData({
      name: "",
      collegeId: "",
      phone: "",
      email: "",
      password: "",
      bloodGroup: "",
      semester: "",
      session: "",
      status: "",
      role: "",
    });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    if (editFormData.role === "cr") {
      if (!editFormData.email || !editFormData.email.trim()) {
        setMessage({ type: "error", text: "Email is required for CR role" });
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(editFormData.email)) {
        setMessage({ type: "error", text: "Please enter a valid email address for CR" });
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
          password: editFormData.password,
          bloodGroup: editFormData.bloodGroup,
          semester: editFormData.semester,
          session: editFormData.session,
          status: editFormData.status,
          role: editFormData.role,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Student updated successfully!" });
        closeEditModal();
        fetchStudents();
        fetchSemesterStats();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to update student" });
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
        body: JSON.stringify({ targetSemester: bulkSemester, studentIds: selectedStudents }),
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
        body: JSON.stringify({ targetSession: bulkSession, studentIds: selectedStudents }),
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
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
  };

  // ✅ Print a single semester (or the whole filtered list)
  const handlePrint = (semesterFilter = null) => {
    const studentsToPrint = semesterFilter
      ? students.filter((s) => s.semester === semesterFilter)
      : filteredStudents;

    if (studentsToPrint.length === 0) {
      window.alert("No students to print.");
      return;
    }

    const title = semesterFilter
      ? `${
          semesterFilter === "graduated"
            ? "Graduated Students"
            : `${semesterFilter} Semester`
        } - Student List`
      : "Student List";

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      window.alert("Please allow popups to print.");
      return;
    }

    const rowsHtml = studentsToPrint
      .map(
        (s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.name || "—"}</td>
          <td>${s.collegeId || "—"}</td>
          <td>${s.bloodGroup || "—"}</td>
          <td>${s.phone || "—"}</td>
          <td>${s.email || "—"}</td>
          <td>${s.session || "—"}</td>
          <td>${s.semester || "—"}</td>
          <td>${s.status || "—"}</td>
          <td>${s.role || "—"}</td>
        </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              padding: 24px;
              color: #111;
            }
            .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1e40af; padding-bottom: 16px; }
            .header h1 { margin: 0; color: #1e40af; font-size: 22px; }
            .header h2 { margin: 4px 0 0; font-size: 16px; font-weight: 500; color: #444; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; color: #444; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            thead { background: #1e40af; color: white; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { font-weight: 600; }
            tbody tr:nth-child(even) { background: #f9fafb; }
            tbody tr:hover { background: #eff6ff; }
            .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            @media print {
              body { padding: 12px; }
              thead { background: #1e40af !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Department of BBA — Adamjee Cantonment College</h1>
            <h2>${title}</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          <div class="meta">
            <span>Total Students: <strong>${studentsToPrint.length}</strong></span>
            <span>Filter: <strong>${semesterFilter || "All"}</strong></span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>College ID</th>
                <th>Blood Group</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Session</th>
                <th>Semester</th>
                <th>Status</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">BBA Department • Adamjee Cantonment College</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ✅ Get semester stats (from API) or fallback to computed counts
  const getSemesterCount = (sem) => {
    const stat = semesterStats.find(
      (s) =>
        (s._id || s.semester || "").toString().toLowerCase() ===
        sem.toString().toLowerCase()
    );
    if (stat && stat.count != null) return stat.count;
    return studentsBySemester[sem]?.length || 0;
  };

  // ✅ Ordered list of semesters we actually have
  const orderedSemesters = SEMESTER_ORDER.filter(
    (s) => studentsBySemester[s] && studentsBySemester[s].length > 0
  );
  // Include any semesters not in the predefined order (safety)
  Object.keys(studentsBySemester).forEach((s) => {
    if (!orderedSemesters.includes(s)) orderedSemesters.push(s);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FaUserGraduate className="text-3xl text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
            </div>
            <p className="text-gray-600 ml-11">
              Manage students, update semesters, and track academic progress
            </p>
          </div>
        </div>

        {/* Message */}
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
              <h2 className="text-lg font-semibold text-gray-900">Add New Student</h2>
            </div>
            {isAddFormOpen ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
          </button>

          {isAddFormOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">Full Name *</label>
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
                    <label className="block text-gray-700 mb-2 text-sm font-medium">College ID (6 digits) *</label>
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
                      <FiPhone className="text-gray-500" /> Phone Number (Optional)
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
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                      <FiMail className="text-gray-500" /> Email (Optional)
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
                    <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                      <FiDroplet className="text-red-500" /> Blood Group (Optional)
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    >
                      <option value="">Not specified</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">Semester</label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    >
                      {["1st","2nd","3rd","4th","5th","6th","7th","8th"].map((s) => (
                        <option key={s} value={s}>{s} Semester</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2 text-sm font-medium">Session</label>
                    <input
                      type="text"
                      name="session"
                      value={formData.session}
                      onChange={handleInputChange}
                      required
                      pattern="\d{4}-\d{2,4}"
                      placeholder="e.g., 2021-22"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
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

        {/* Bulk Operations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => setIsBulkOperationsOpen(!isBulkOperationsOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <HiOutlineUserGroup className="text-xl text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bulk Operations</h2>
              {selectedStudents.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                  {selectedStudents.length} selected
                </span>
              )}
            </div>
            {isBulkOperationsOpen ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
          </button>

          {isBulkOperationsOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Update Semester</label>
                  <div className="flex gap-2">
                    <select
                      value={bulkSemester}
                      onChange={(e) => setBulkSemester(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                    >
                      <option value="">Select Semester</option>
                      {["1st","2nd","3rd","4th","5th","6th","7th","8th","graduated"].map((s) => (
                        <option key={s} value={s}>{s === "graduated" ? "Graduated" : `${s} Semester`}</option>
                      ))}
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
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Update Session</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bulkSession}
                      onChange={(e) => setBulkSession(e.target.value)}
                      placeholder="e.g., 2021-22"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
                    />
                    <button
                      onClick={handleBulkSessionUpdate}
                      disabled={loading || selectedStudents.length === 0}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search & Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search by ${searchType}...`}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="name">Name</option>
                <option value="collegeId">College ID</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="bloodGroup">Blood Group</option>
              </select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={selectAllStudents}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium"
              >
                {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? (
                  <FiCheckSquare />
                ) : (
                  <FiSquare />
                )}
                {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </button>

              <button
                onClick={expandAll}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition text-sm font-medium"
              >
                <FiChevronDown /> Expand All
              </button>

              <button
                onClick={collapseAll}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition text-sm font-medium"
              >
                <FiChevronUp /> Collapse All
              </button>

              <button
                onClick={() => handlePrint(null)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
              >
                <FiPrinter /> Print All
              </button>

              <button
                onClick={fetchStudents}
                disabled={studentFetchLoad}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium disabled:opacity-50"
              >
                <FiRefreshCw className={studentFetchLoad ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Semester-wise Collapsible Sections */}
        {studentFetchLoad ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiRefreshCw className="animate-spin text-4xl text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        ) : orderedSemesters.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FaUserGraduate className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">
              {searchTerm ? "No students match your search." : "No students found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orderedSemesters.map((sem) => {
              const list = studentsBySemester[sem] || [];
              const isOpen = !!openSemesters[sem];
              const label =
                sem === "graduated"
                  ? "Graduated Students"
                  : sem === "unassigned"
                  ? "Unassigned Semester"
                  : `${sem} Semester`;

              const allInSemSelected =
                list.length > 0 && list.every((s) => selectedStudents.includes(s._id));

              return (
                <div
                  key={sem}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Semester Header */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 transition">
                    <button
                      onClick={() => toggleSemester(sem)}
                      className="flex items-center gap-3 flex-1 text-left"
                      aria-expanded={isOpen}
                    >
                      <span
                        className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                          isOpen ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <FaGraduationCap className="text-blue-600 text-lg" />
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          {label}
                        </h3>
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {list.length}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Quick select-all within this semester */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const ids = list.map((s) => s._id);
                          const allSelected = ids.every((id) =>
                            selectedStudents.includes(id)
                          );
                          if (allSelected) {
                            setSelectedStudents((prev) =>
                              prev.filter((id) => !ids.includes(id))
                            );
                          } else {
                            setSelectedStudents((prev) => [
                              ...new Set([...prev, ...ids]),
                            ]);
                          }
                        }}
                        className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition"
                        title="Select all in this semester"
                      >
                        {allInSemSelected ? <FiCheckSquare /> : <FiSquare />}
                        {allInSemSelected ? "Deselect" : "Select"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(sem);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 rounded transition"
                        title={`Print ${label}`}
                      >
                        <FiPrinter /> Print
                      </button>
                    </div>
                  </div>

                  {/* Semester Body */}
                  {isOpen && (
                    <div className="border-t border-gray-100 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-left w-10"></th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">College ID</th>
                            <th className="px-3 py-2 text-left">Blood</th>
                            <th className="px-3 py-2 text-left">Phone</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Session</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Role</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((s) => {
                            const checked = selectedStudents.includes(s._id);
                            return (
                              <tr
                                key={s._id}
                                className={`border-t border-gray-100 hover:bg-blue-50/40 transition ${
                                  checked ? "bg-blue-50/60" : ""
                                }`}
                              >
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => toggleStudentSelection(s._id)}
                                    className="text-blue-600 hover:text-blue-800"
                                    aria-label="Select student"
                                  >
                                    {checked ? <FiCheckSquare /> : <FiSquare />}
                                  </button>
                                </td>
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {s.name}
                                </td>
                                <td className="px-3 py-2 text-gray-700">
                                  {s.collegeId}
                                </td>
                                <td className="px-3 py-2">
                                  {s.bloodGroup ? (
                                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                      <FiDroplet /> {s.bloodGroup}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-700">
                                  {s.phone || <span className="text-gray-400">—</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-700">
                                  {s.email || <span className="text-gray-400">—</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-700">
                                  {s.session || "—"}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      s.status === "active"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {s.status || "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 capitalize text-gray-700">
                                  {s.role || "student"}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => openEditModal(s)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                      title="Edit"
                                    >
                                      <FiEdit2 />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStudent(s._id)}
                                      disabled={deletingStudentId === s._id}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                      title="Delete"
                                    >
                                      <MdDelete />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Edit Modal ===== */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiEdit2 className="text-blue-600" />
                Edit Student
              </h2>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              >
                <FiX />
              </button>
            </div>

            <div className="p-6 space-y-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    College ID
                  </label>
                  <input
                    type="text"
                    value={editFormData.collegeId}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiPhone className="text-gray-500" /> Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiMail className="text-gray-500" /> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiLock className="text-gray-500" /> New Password (leave blank to keep)
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <FiDroplet className="text-red-500" /> Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    value={editFormData.bloodGroup}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">Not specified</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium flex items-center gap-2">
                    <IoCalendarOutline className="text-gray-500" /> Semester
                  </label>
                  <select
                    name="semester"
                    value={editFormData.semester}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    {["1st","2nd","3rd","4th","5th","6th","7th","8th","graduated"].map((s) => (
                      <option key={s} value={s}>
                        {s === "graduated" ? "Graduated" : `${s} Semester`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Session</label>
                  <input
                    type="text"
                    name="session"
                    value={editFormData.session}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">Role</label>
                  <select
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="student">Student</option>
                    <option value="cr">CR</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 font-medium flex items-center gap-2"
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