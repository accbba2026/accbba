// app/faculty/courses/page.jsx
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
  FiBook,
  FiCode,
  FiUser,
  FiAlertTriangle,
} from "react-icons/fi";
import { FaChalkboardTeacher, FaGraduationCap } from "react-icons/fa";

const CoursesPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    courseName: "",
    courseCode: "",
    semester: "1st",
    teacherName: "",
  });

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const semesters = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  // Fetch courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/faculty/courses");
      const data = await response.json();
      if (data.success) {
        setCourses(data.data);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      setMessage({ type: "error", text: "Failed to fetch courses" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    //eslint-disable-next-line
    fetchCourses();
  }, []);

  // Filter courses based on search and semester
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSemester =
      selectedSemester === "all" || course.semester === selectedSemester;

    return matchesSearch && matchesSemester;
  });

  // Group courses by semester
  const coursesBySemester = filteredCourses.reduce((acc, course) => {
    const semester = course.semester;
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(course);
    return acc;
  }, {});

  // Handle form input change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Open add modal
  const openAddModal = () => {
    setIsEditing(false);
    setEditingCourse(null);
    setFormData({
      courseName: "",
      courseCode: "",
      semester: "1st",
      teacherName: user?.name || "",
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (course) => {
    setIsEditing(true);
    setEditingCourse(course);
    setFormData({
      courseName: course.courseName,
      courseCode: course.courseCode || "",
      semester: course.semester,
      teacherName: course.teacherName,
    });
    setIsModalOpen(true);
  };

  // Open delete confirmation modal
  const openDeleteModal = (course) => {
    setCourseToDelete(course);
    setIsDeleteModalOpen(true);
  };

  // Add/Update course
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const url = isEditing
        ? "/api/faculty/courses/update"
        : "/api/faculty/courses/create";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { id: editingCourse._id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: isEditing
            ? "Course updated successfully!"
            : "Course added successfully!",
        });
        setIsModalOpen(false);
        fetchCourses();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Delete course
  const handleDelete = async () => {
    if (!courseToDelete) return;

    setLoading(true);
    try {
      const response = await fetch("/api/faculty/courses/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: courseToDelete._id }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Course deleted successfully!" });
        setIsDeleteModalOpen(false);
        setCourseToDelete(null);
        fetchCourses();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const semesterOrder = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

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
                  Course Management
                </h1>
              </div>
              <p className="text-gray-600 ml-11">
                Manage courses, organize by semester
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <FiPlus /> Add Course
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

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Search
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by course name, code or teacher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full  text-gray-600 pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
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
            <div className="w-full md:w-64">
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Filter by Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Semesters</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem} Semester
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchCourses}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-purple-100 text-sm">Total Courses</p>
              <p className="text-white text-3xl font-bold">{filteredCourses.length}</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <FiBook className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Courses by Semester */}
        <div className="space-y-6">
          {semesterOrder.map((semester) => {
            const semesterCourses = coursesBySemester[semester] || [];
            if (semesterCourses.length === 0) return null;

            return (
              <div
                key={semester}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <FaGraduationCap className="text-purple-600 text-xl" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      {semester} Semester
                    </h2>
                    <span className="ml-2 text-sm text-gray-600">
                      ({semesterCourses.length} courses)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-gray-600 text-sm">
                        <th className="px-6 py-3 text-left">#</th>
                        <th className="px-6 py-3 text-left">Course Name</th>
                        <th className="px-6 py-3 text-left">Course Code</th>
                        <th className="px-6 py-3 text-left">Teacher</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {semesterCourses.map((course, index) => (
                        <tr key={course._id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-gray-600">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FiBook className="text-purple-500" />
                              <span className="font-medium text-gray-900">
                                {course.courseName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FiCode className="text-gray-400" />
                              <span className="font-mono text-gray-600">
                                {course.courseCode || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FiUser className="text-gray-400" />
                              <span className="text-gray-600">{course.teacherName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditModal(course)}
                                className="text-blue-600 hover:text-blue-800 transition"
                              >
                                <FiEdit2 size={18} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(course)}
                                className="text-red-600 hover:text-red-800 transition"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </div>
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

        {filteredCourses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FiBook className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchTerm || selectedSemester !== "all"
                ? "No courses match your search criteria."
                : "No courses found. Add your first course!"}
            </p>
          </div>
        )}

        {/* Add/Edit Course Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? "Edit Course" : "Add New Course"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    name="courseName"
                    value={formData.courseName}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Introduction to Business"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Course Code
                  </label>
                  <input
                    type="text"
                    name="courseCode"
                    value={formData.courseCode}
                    onChange={handleInputChange}
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., 500015"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Semester *
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    required
                    className="w-full  text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    name="teacherName"
                    value={formData.teacherName}
                    onChange={handleInputChange}
                    required
                    className="w-full  text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter teacher name"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    <FiSave className="inline mr-2" />
                    {loading ? "Saving..." : isEditing ? "Update Course" : "Add Course"}
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

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && courseToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Delete Course
                </h2>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <FiAlertTriangle className="text-red-600 text-3xl" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Are you sure?
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  You are about to delete the course:{" "}
                  <span className="font-semibold">{courseToDelete.courseName}</span>
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-700 text-sm flex items-center gap-2">
                    <FiAlertTriangle />
                    <strong>Warning:</strong> All assignments and associated data
                    for this course will be permanently deleted!
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    {loading ? "Deleting..." : "Yes, Delete Course"}
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-gray-500">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;