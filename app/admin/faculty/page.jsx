// app/admin/faculty/page.jsx
"use client";
import { useState, useEffect } from "react";
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiMail, 
  FiPhone, 
  FiUser, 
  FiX,
  FiSave,
  FiRefreshCw,
  FiSearch
} from "react-icons/fi";
import { FaChalkboardTeacher, FaUserTie } from "react-icons/fa";

const FacultyMembers = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    password: "",
  });

  // Fetch faculty members
  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/get-faculty");
      const data = await response.json();
      if (data.success) {
        setFaculty(data.data);
      }
    } catch (error) {
      console.error("Error fetching faculty:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    //eslint-disable-next-line
    fetchFaculty();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Add Faculty
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/user/create-faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setFormData({ name: "", email: "", phone: "", designation: "", password: "" });
        setIsAddModalOpen(false);
        fetchFaculty();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Edit Faculty
  const handleEditFaculty = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/user/update-faculty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedFaculty._id,
          name: formData.name,
          phone: formData.phone,
          designation: formData.designation,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setIsEditModalOpen(false);
        setSelectedFaculty(null);
        setFormData({ name: "", email: "", phone: "", designation: "", password: "" });
        fetchFaculty();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Delete Faculty
  const handleDeleteFaculty = async (id) => {
    if (!confirm("Are you sure you want to delete this faculty member?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/user/delete-faculty", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Faculty member deleted successfully!" });
        fetchFaculty();
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (faculty) => {
    setSelectedFaculty(faculty);
    setFormData({
      name: faculty.name,
      email: faculty.email,
      phone: faculty.phone || "",
      designation: faculty.designation || "",
      password: "",
    });
    setIsEditModalOpen(true);
  };

  const filteredFaculty = faculty.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.designation && member.designation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaChalkboardTeacher className="text-3xl text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Faculty Management</h1>
              </div>
              <p className="text-gray-600 ml-11">Manage faculty members, their details and credentials</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FiPlus /> Add Faculty
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <FiSearch className="text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search by name, email or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>

        {/* Faculty Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Designation</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No faculty members found
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((member, index) => (
                    <tr key={member._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FaUserTie className="text-blue-500" />
                          <span className="font-medium text-gray-900">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{member.email}</td>
                      <td className="px-6 py-4 text-gray-600">{member.phone || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{member.designation || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {member.status || "active"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="text-blue-600 hover:text-blue-800 transition"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteFaculty(member._id)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <FiTrash2 size={18} />
                          </button>
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-500">Processing...</span>
            </div>
          </div>
        )}

        {/* Add Faculty Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add Faculty Member</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddFaculty} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="faculty@example.com"
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
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 017xxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bangladeshi number format: 01XXXXXXXXX</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Designation (Optional)</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Professor, Associate Professor, Lecturer"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Password</label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty to auto-generate"
                  />
                  <p className="text-xs text-gray-500 mt-1">If left empty, a random password will be generated and sent via email</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <FiSave className="inline mr-2" />
                    {loading ? "Adding..." : "Add Faculty"}
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

        {/* Edit Faculty Modal */}
        {isEditModalOpen && selectedFaculty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Edit Faculty Member</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleEditFaculty} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    value={selectedFaculty.email}
                    disabled
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium flex items-center gap-2">
                    <FiPhone /> Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    pattern="01[3-9]\d{8}"
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 017xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Professor, Associate Professor, Lecturer"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">New Password (Optional)</label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty to keep current password"
                  />
                  <p className="text-xs text-gray-500 mt-1">If you want to change password, enter a new one. It will be sent via email.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <FiSave className="inline mr-2" />
                    {loading ? "Updating..." : "Update Faculty"}
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

export default FacultyMembers;