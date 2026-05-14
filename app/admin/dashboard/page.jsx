// app/admin/dashboard/page.jsx
import Link from "next/link";
import React from "react";
import { 
  FaUserGraduate, 
  FaUsers, 
  FaTasks, 
  FaCalendarCheck,
  FaChalkboardTeacher,
  FaHistory
} from "react-icons/fa";

const Page = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl text-center font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 text-center mt-1">Welcome back, Admin</p>
        </div>

        {/* Services Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-white text-xl font-semibold">Services</h2>
            <p className="text-blue-100 text-sm mt-1">Quick access to manage your tasks</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Profile Tab */}
              <Link
                href="/admin/profile"
                className="group relative overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaUserGraduate className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Profile</h3>
                  <p className="text-white/80 text-sm mt-1">Manage your account</p>
                </div>
              </Link>

              {/* Students Tab */}
              <Link
                href="/faculty/students"
                className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaUsers className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Students</h3>
                  <p className="text-white/80 text-sm mt-1">View all students</p>
                </div>
              </Link>

              {/* Faculty Tab */}
              <Link
                href="/admin/faculty"
                className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaChalkboardTeacher className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Faculty</h3>
                  <p className="text-white/80 text-sm mt-1">Manage faculty members</p>
                </div>
              </Link>

              {/* Assignments Tab */}
              <Link
                href="/faculty/assignments"
                className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaTasks className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Assignments</h3>
                  <p className="text-white/80 text-sm mt-1">Manage assignments</p>
                </div>
              </Link>

              {/* Attendance Tab */}
              <Link
                href="/faculty/attendance"
                className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaCalendarCheck className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Attendance</h3>
                  <p className="text-white/80 text-sm mt-1">Track attendance</p>
                </div>
              </Link>
              {/* Courses Tab */}
              <Link
                href="/faculty/courses"
                className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaChalkboardTeacher className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Courses</h3>
                  <p className="text-white/80 text-sm mt-1">Manage courses</p>
                </div>
              </Link>
              {/* Logs Tab */}
              <Link
                href="/admin/logs"
                className="group relative overflow-hidden bg-gradient-to-br from-lime-500 to-lime-500 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mt-10 -mr-10"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -mb-10 -ml-10"></div>
                <div className="relative z-10">
                  <FaHistory className="text-white text-3xl mb-3" />
                  <h3 className="text-white font-semibold text-lg">Logs</h3>
                  <p className="text-white/80 text-sm mt-1">View system logs</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;