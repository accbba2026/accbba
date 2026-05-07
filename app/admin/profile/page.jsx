// app/admin/profile/page.jsx - Cleaned up version with proper data handling
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ChangePassword from "@/app/components/profile/changePassword";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaCalendarAlt,
  FaUserShield,
  FaEdit,
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";

const AdminProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    collegeId: "",
    role: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [isFetching, setIsFetching] = useState(true);

  // Debug: Log user data
  useEffect(() => {
    console.log("User from AuthContext:", user);
  }, [user]);

  // Fetch additional user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      // Try to get user ID from different possible locations
      const userId = user?.id || user?._id;

      console.log("Fetching user data for ID:", userId);

      if (!userId) {
        console.error("No user ID found in user object:", user);
        // Use the user from AuthContext as fallback
        if (user) {
          setFullUserData(user);
        }
        setIsFetching(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/profile`);
        const data = await response.json();
        console.log("Fetched user data response:", data);

        if (data.success) {
          setFullUserData(data.data);
        } else {
          console.error("Failed to fetch user data:", data.message);
          // Fallback to user from AuthContext
          setFullUserData(user);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to user from AuthContext
        setFullUserData(user);
      } finally {
        setIsFetching(false);
      }
    };

    if (user) {
      fetchUserData();
    } else {
      //eslint-disable-next-line
      setIsFetching(false);
    }
  }, [user]);

  // Sync form data with fullUserData
  useEffect(() => {
    if (fullUserData) {
      console.log("Setting form data from fullUserData:", fullUserData);
      //eslint-disable-next-line
      setFormData({
        name: fullUserData.name || "",
        email: fullUserData.email || "",
        phone: fullUserData.phone || "",
        collegeId: fullUserData.collegeId || "N/A",
        role: fullUserData.role || "admin",
      });
    }
  }, [fullUserData]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const userId = user?.id || user?._id;

    try {
      const response = await fetch("/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFullUserData(data.data);

        // Update local storage
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const updatedUser = {
          ...storedUser,
          id: userId,
          name: data.data.name,
          phone: data.data.phone || "",
          email: data.data.email,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        window.dispatchEvent(new Event("userUpdated"));

        setMessage({ type: "success", text: "Profile updated successfully!" });
        setIsEditing(false);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update profile",
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return { color: "bg-red-100 text-red-700", label: "Administrator" };
      case "faculty":
        return {
          color: "bg-purple-100 text-purple-700",
          label: "Faculty Member",
        };
      case "cr":
        return {
          color: "bg-green-100 text-green-700",
          label: "Class Representative",
        };
      default:
        return { color: "bg-blue-100 text-blue-700", label: "Student" };
    }
  };

  // Determine which data to display - prioritize fullUserData over user
  const displayData = fullUserData || user;
  const roleBadge = getRoleBadge(displayData?.role);

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No user data available</p>
        </div>
      </div>
    );
  }

  console.log("Display Data:", displayData);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
          <p className="text-gray-600 mt-1">
            View and manage your profile information
          </p>
        </div>

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

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card - Left Side */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaUser className="text-white text-4xl" />
                </div>
                <h3 className="text-white text-xl font-semibold">
                  {displayData?.name || "User"}
                </h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${roleBadge.color}`}
                >
                  {roleBadge.label}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <FaIdCard className="text-gray-400" />
                  <span className="text-sm">
                    ID: <strong>{displayData?.collegeId || "N/A"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaEnvelope className="text-gray-400" />
                  <span className="text-sm break-all">
                    {displayData?.email || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaPhone className="text-gray-400" />
                  <span className="text-sm">
                    {displayData?.phone || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaCalendarAlt className="text-gray-400" />
                  <span className="text-sm">
                    Joined:{" "}
                    {displayData?.createdAt
                      ? new Date(displayData.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaClock className="text-gray-400" />
                  <span className="text-sm">
                    Last Updated:{" "}
                    {displayData?.updatedAt
                      ? new Date(displayData.updatedAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form - Right Side */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? "Edit Profile" : "Profile Information"}
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FaEdit /> Edit Profile
                  </button>
                )}
              </div>

              <div className="p-6">
                {!isEditing ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Full Name
                        </label>
                        <p className="text-gray-900 text-lg">
                          {displayData?.name || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          College ID
                        </label>
                        <p className="text-gray-900 text-lg">
                          {displayData?.collegeId || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email Address
                        </label>
                        <p className="text-gray-900 text-lg">
                          {displayData?.email || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Phone Number
                        </label>
                        <p className="text-gray-900 text-lg">
                          {displayData?.phone || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Role
                        </label>
                        <p className="text-gray-900 text-lg capitalize">
                          {displayData?.role || "admin"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Status
                        </label>
                        <p className="text-gray-900 text-lg capitalize">
                          {displayData?.status || "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
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
                          className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                          College ID
                        </label>
                        <input
                          type="text"
                          value={formData.collegeId}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          College ID cannot be changed
                        </p>
                      </div>

                      <div>
                        <label className="text-gray-700 mb-2 font-medium block">
                          Email Address{" "}
                          <span className="bg-red-100 text-red-700 text-[10px] rounded-xl p-1 px-2 ml-1">
                            Primary
                          </span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          disabled
                          value={displayData?.email || ""}
                          className="w-full mt-1 text-gray-400 px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          pattern="01[3-9]\d{8}"
                          className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 017xxxxxxxx"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Bangladeshi number format: 01XXXXXXXXX
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <FaSave /> {isLoading ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: displayData?.name || "",
                            email: displayData?.email || "",
                            phone: displayData?.phone || "",
                            collegeId: displayData?.collegeId || "N/A",
                            role: displayData?.role || "admin",
                          });
                          setMessage({ type: "", text: "" });
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                      >
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Account Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <FaUserShield className="text-blue-600 text-xl mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Account Type</p>
                      <p className="text-gray-900 font-medium capitalize">
                        {displayData?.role || "admin"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FaCheckCircle className="text-green-600 text-xl mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Account Status</p>
                      <p className="text-gray-900 font-medium capitalize">
                        {displayData?.status || "Active"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className="text-yellow-600 text-xl mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="text-gray-900 font-mono text-sm">
                        {user?.id || user?._id || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FaCalendarAlt className="text-purple-600 text-xl mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Account Created</p>
                      <p className="text-gray-900">
                        {displayData?.createdAt
                          ? new Date(displayData.createdAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Change Password Card */}
            <ChangePassword
              userEmail={displayData?.email}
              userCollegeId={displayData?.collegeId}
              userRole={displayData?.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
