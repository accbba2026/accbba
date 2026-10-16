// app/cr/students/page.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiUserPlus,
  FiEdit2,
  FiX,
  FiSave,
  FiSearch,
  FiRefreshCw,
  FiMail,
  FiPhone,
  FiUser,
  FiStar,
  FiPrinter,
  FiDroplet,
} from "react-icons/fi";
import { FaStar, FaUsers, FaGraduationCap } from "react-icons/fa";
import toast from "react-hot-toast";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CRStudentsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [message, setMessage] = useState({ type: "", text: "" });

  // Add Student Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    collegeId: "",
    phone: "",
    email: "",
    bloodGroup: "",
    semester: "",
  });

  // Edit Student Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    email: "",
    bloodGroup: "",
  });

  const crSemester = user?.semester || "1st";

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/cr/get-students?semester=${crSemester}`,
      );
      const data = await response.json();
      if (data.success) {
        let allStudents = [...data.data];

        // Add the CR themselves if not present
        if (user && user.role === "cr" && user.semester === crSemester) {
          const crExists = allStudents.some(
            (s) => s.collegeId === user.collegeId,
          );
          if (!crExists && user.collegeId) {
            allStudents.unshift({
              _id: user.id,
              name: user.name,
              collegeId: user.collegeId,
              phone: user.phone || null,
              email: user.email || null,
              bloodGroup: user.bloodGroup || null,
              semester: user.semester,
              session: user.session,
              role: "cr",
              isCR: true,
            });
          }
        }
        setStudents(allStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage({ type: "error", text: "Failed to fetch students" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchStudents();
    // eslint-disable-next-line
  }, [user]);

  // Search filter
  const filteredStudents = students.filter((student) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (searchType === "name")
      return student.name?.toLowerCase().includes(term);
    if (searchType === "collegeId")
      return student.collegeId?.includes(searchTerm);
    if (searchType === "phone") return student.phone?.includes(searchTerm);
    if (searchType === "bloodGroup")
      return student.bloodGroup && student.bloodGroup.toLowerCase() === term;
    return true;
  });

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleEditInputChange = (e) =>
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  // Add student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!/^\d{6}$/.test(formData.collegeId)) {
      toast.error("College ID must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      await toast.promise(
        (async () => {
          const response = await fetch("/api/cr/create-student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, semester: crSemester }),
          });
          const data = await response.json();
          if (!data.success)
            throw new Error(data.message || "Failed to add student");
          return data;
        })(),
        {
          loading: "Adding student...",
          success: "Student added successfully!",
          error: (err) => err.message || "Failed to add student",
        },
      );

      setFormData({
        name: "",
        collegeId: "",
        phone: "",
        email: "",
        bloodGroup: "",
        semester: "",
      });
      setIsAddModalOpen(false);
      await fetchStudents();
    } catch (error) {
      console.error("Add student error:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (student) => {
    if (student.isCR) {
      setMessage({
        type: "error",
        text: "You cannot edit your own CR profile here. Go to Profile page.",
      });
      return;
    }
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      phone: student.phone || "",
      email: student.email || "",
      bloodGroup: student.bloodGroup || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await toast.promise(
        (async () => {
          const response = await fetch("/api/cr/update-student", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingStudent._id,
              name: editFormData.name,
              phone: editFormData.phone,
              email: editFormData.email,
              bloodGroup: editFormData.bloodGroup,
            }),
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.message || "Failed to update student");
          }

          return data;
        })(),
        {
          loading: "Updating student...",
          success: "Student updated successfully!",
          error: (err) => err.message || "Failed to update student",
        },
      );

      // On success:
      setIsEditModalOpen(false);
      setEditingStudent(null);
      await fetchStudents();
    } catch (error) {
      console.error("Update student error:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Print: College ID first, then name, phone, and blank space for checkmark
  const handlePrint = () => {
    const studentsToPrint = [...filteredStudents].sort((a, b) =>
      (a.collegeId || "").localeCompare(b.collegeId || ""),
    );

    if (studentsToPrint.length === 0) {
      window.alert("No students to print.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      window.alert("Please allow popups to print.");
      return;
    }

    const rowsHtml = studentsToPrint
      .map(
        (s, idx) => `
        <tr>
          <td class="serial">${idx + 1}</td>
          <td class="id">${s.collegeId || "—"}</td>
          <td class="name">${s.name || "—"}</td>
          <td class="phone">${s.phone || "—"}</td>
          <td class="blank"></td>
        </tr>`,
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student List - ${crSemester} Semester</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              padding: 24px;
              color: #111;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #15803d; padding-bottom: 12px; }
            .header h1 { margin: 0; color: #15803d; font-size: 20px; }
            .header h2 { margin: 4px 0 0; font-size: 15px; font-weight: 500; color: #444; }
            .header p { margin: 4px 0 0; font-size: 11px; color: #666; }
            .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 10px; color: #444; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            thead { background: #15803d; color: white; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { font-weight: 600; }
            tbody tr:nth-child(even) { background: #f9fafb; }
            td.blank { min-width: 120px; background: #fff !important; }
            .footer { margin-top: 24px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            .note { font-size: 10px; color: #666; margin-top: 6px; font-style: italic; }
            @media print {
              body { padding: 12px; }
              thead { background: #15803d !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Department of BBA — Adamjee Cantonment College</h1>
            <h2>${crSemester} Semester — Student List</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          <div class="meta">
            <span>Total Students: <strong>${studentsToPrint.length}</strong></span>
            <span>Semester: <strong>${crSemester}</strong></span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 120px;">College ID</th>
                <th>Name</th>
                <th style="width: 140px;">Phone</th>
                <th>Notes / Checkmark</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p class="note">* Use the last column for checkmarks, notes, or signatures.</p>
          <div class="footer">BBA Department • Adamjee Cantonment College</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaStar className="text-3xl text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Student Management
                </h1>
              </div>
              <p className="text-gray-600 ml-11">
                Manage students for{" "}
                <span className="font-semibold text-green-600">
                  {crSemester} Semester
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              {/* ✅ Print button */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-green-400 hover:text-green-700 transition font-medium shadow-sm"
              >
                <FiPrinter /> Print
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <FiUserPlus /> Add Student
              </button>
            </div>
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

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="md:w-48">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Search by
              </label>
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value);
                  setSearchTerm("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
              >
                <option value="name">Name</option>
                <option value="collegeId">College ID</option>
                <option value="phone">Phone</option>
                <option value="bloodGroup">Blood Group</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                {searchType === "bloodGroup"
                  ? "Select Blood Group"
                  : "Search Term"}
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                {searchType === "bloodGroup" ? (
                  <select
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
                  >
                    <option value="">All blood groups</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder={`Search by ${searchType}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-gray-700 pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        <FiX />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="md:self-end">
              <button
                onClick={fetchStudents}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition w-full md:w-auto"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100 text-sm">Total Students</p>
              <p className="text-white text-3xl font-bold">{students.length}</p>
              {searchTerm && (
                <p className="text-green-100 text-xs mt-1">
                  Showing {filteredStudents.length} match
                  {filteredStudents.length !== 1 ? "es" : ""}
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <FaUsers className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Students Table - Redesigned */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-600 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 text-left">#</th>
                  <th className="px-6 py-4 text-left">Student</th>
                  <th className="px-6 py-4 text-left">College ID</th>
                  <th className="px-6 py-4 text-left">Blood</th>
                  <th className="px-6 py-4 text-left">Phone</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {loading
                        ? "Loading..."
                        : "No students found in your semester"}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr
                      key={student._id}
                      className={`transition-colors ${
                        student.isCR
                          ? "bg-yellow-50/60 hover:bg-yellow-100/60"
                          : "hover:bg-green-50/40"
                      }`}
                    >
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                              student.isCR
                                ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                                : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                            }`}
                          >
                            {student.isCR ? (
                              <FiStar size={14} />
                            ) : (
                              student.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {student.name}
                              {student.isCR && (
                                <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                                  You (CR)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {student.collegeId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.bloodGroup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <FiDroplet className="text-red-500" size={12} />
                            {student.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700 text-sm">
                        {student.phone ? (
                          <span className="flex items-center gap-1.5">
                            <FiPhone size={12} className="text-gray-400" />
                            {student.phone}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700 text-sm">
                        {student.email ? (
                          <span className="flex items-center gap-1.5">
                            <FiMail size={12} className="text-gray-400" />
                            {student.email}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            student.isCR
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {student.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          {!student.isCR ? (
                            <button
                              onClick={() => openEditModal(student)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                              title="Edit"
                            >
                              <FiEdit2 size={14} />
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs italic">
                              Edit from Profile
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="text-gray-500">Processing...</span>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add New Student
                </h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Enter student name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    College ID (6 digits) *
                  </label>
                  <input
                    type="text"
                    name="collegeId"
                    value={formData.collegeId}
                    onChange={handleInputChange}
                    required
                    pattern="\d{6}"
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Enter 6-digit ID"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiPhone /> Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    pattern="01[3-9]\d{8}"
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 017xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiMail /> Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="student@example.com"
                  />
                </div>

                {/* ✅ Blood group */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiDroplet className="text-red-500" /> Blood Group
                    (Optional)
                  </label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Not specified</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={crSemester}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Student will be added to your semester
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <FiSave className="inline mr-2" />
                    {loading ? "Adding..." : "Add Student"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {isEditModalOpen && editingStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit Student
                </h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    College ID
                  </label>
                  <input
                    type="text"
                    value={editingStudent.collegeId}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiPhone /> Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditInputChange}
                    pattern="01[3-9]\d{8}"
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 017xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiMail /> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="student@example.com"
                  />
                </div>

                {/* ✅ Blood group in edit modal */}
                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiDroplet className="text-red-500" /> Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    value={editFormData.bloodGroup}
                    onChange={handleEditInputChange}
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Not specified</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={editingStudent.semester}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Semester cannot be changed by CR
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <FiSave className="inline mr-2" />
                    {loading ? "Updating..." : "Update Student"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
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

export default CRStudentsPage;
