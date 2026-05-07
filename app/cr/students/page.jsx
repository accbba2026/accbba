// app/cr/students/page.jsx - Updated to include CR in student list
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
} from "react-icons/fi";
import { FaStar, FaUsers, FaGraduationCap } from "react-icons/fa";

const CRStudentsPage = () => {
  const { user } = useAuth();
  console.log(user);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Add Student Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    collegeId: "",
    phone: "",
    email: "",
    semester: "",
  });
  
  // Edit Student Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Get CR's semester from user data
  const crSemester = user?.semester || "1st";

  // Fetch students for CR's semester only and include CR
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cr/get-students?semester=${crSemester}`);
      const data = await response.json();
      if (data.success) {
        let allStudents = [...data.data];
        
        // Add the CR to the list if they are in the same semester
        if (user && user.role === 'cr' && user.semester === crSemester) {
          // Check if CR is already in the list (avoid duplicate)
          const crExists = allStudents.some(s => s.collegeId === user.collegeId);
          if (!crExists && user.collegeId) {
            const crStudent = {
              _id: user.id,
              name: user.name,
              collegeId: user.collegeId,
              phone: user.phone || null,
              email: user.email || null,
              semester: user.semester,
              session: user.session,
              role: 'cr',
              isCR: true, // Mark as CR for special styling
            };
            allStudents.unshift(crStudent); // Add CR at the top
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
    if (user) {
        //eslint-disable-next-line 
      fetchStudents();
    }
  }, [user]);

  // Filter students based on search
  const filteredStudents = students.filter((student) =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.collegeId?.includes(searchTerm)
  );

  // Handle input change for add form
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle edit input change
  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // Add new student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validate college ID format
    if (!/^\d{6}$/.test(formData.collegeId)) {
      setMessage({ type: "error", text: "College ID must be 6 digits" });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/cr/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          semester: crSemester,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Student added successfully!" });
        setFormData({ name: "", collegeId: "", phone: "", email: "", semester: "" });
        setIsAddModalOpen(false);
        fetchStudents();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal (only for regular students, not CR)
  const openEditModal = (student) => {
    if (student.isCR) {
      setMessage({ type: "error", text: "You cannot edit your own CR profile here. Go to Profile page." });
      return;
    }
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      phone: student.phone || "",
      email: student.email || "",
    });
    setIsEditModalOpen(true);
  };

  // Update student
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/cr/update-student", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStudent._id,
          name: editFormData.name,
          phone: editFormData.phone,
          email: editFormData.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Student updated successfully!" });
        setIsEditModalOpen(false);
        setEditingStudent(null);
        fetchStudents();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
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
                <FaStar className="text-3xl text-green-600" />
                <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
              </div>
              <p className="text-gray-600 ml-11">
                Manage students for <span className="font-semibold text-green-600">{crSemester} Semester</span>
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FiUserPlus /> Add Student
            </button>
          </div>
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

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <FiSearch className="text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search by name or college ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-gray-500 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX />
              </button>
            )}
            <button
              onClick={fetchStudents}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100 text-sm">Total Students</p>
              <p className="text-white text-3xl font-bold">{students.length}</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <FaUsers className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">College ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      {loading ? "Loading..." : "No students found in your semester"}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr 
                      key={student._id} 
                      className={`hover:bg-gray-50 transition ${student.isCR ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-6 py-4 text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {student.isCR ? (
                            <FiStar className="text-yellow-500" />
                          ) : (
                            <FiUser className="text-green-500" />
                          )}
                          <span className={`font-medium ${student.isCR ? 'text-yellow-700' : 'text-gray-900'}`}>
                            {student.name}
                            {student.isCR && <span className="ml-2 text-xs text-yellow-600">(You - CR)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">{student.collegeId}</td>
                      <td className="px-6 py-4 text-gray-600">{student.phone || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{student.email || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.isCR ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {student.semester}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          student.isCR ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {student.isCR ? 'CR' : 'Student'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!student.isCR && (
                          <button
                            onClick={() => openEditModal(student)}
                            className="text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                          >
                            <FiEdit2 /> Edit
                          </button>
                        )}
                        {student.isCR && (
                          <span className="text-gray-400 text-sm">Edit from Profile</span>
                        )}
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
                <h2 className="text-xl font-semibold text-gray-900">Add New Student</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Enter student name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">College ID (6 digits) *</label>
                  <input
                    type="text"
                    name="collegeId"
                    value={formData.collegeId}
                    onChange={handleInputChange}
                    required
                    pattern="\d{6}"
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 017xxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bangladeshi number: 01XXXXXXXXX</p>
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
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={crSemester}
                    disabled
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Student will be added to your semester</p>
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
                <h2 className="text-xl font-semibold text-gray-900">Edit Student</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    className="w-full px-4 text-gray-500 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">College ID</label>
                  <input
                    type="text"
                    value={editingStudent.collegeId}
                    disabled
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">College ID cannot be changed</p>
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
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Semester</label>
                  <input
                    type="text"
                    value={editingStudent.semester}
                    disabled
                    className="w-full text-gray-500 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Semester cannot be changed by CR</p>
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