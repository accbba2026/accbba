// app/page.js
"use client";
import { useAuth } from "@/app/context/AuthContext";
import AssignmentSubmissionToday from "./components/home/AssignmentSubmissionToday";
import MyAttendance from "./components/home/MyAttendance";
import StudentAssignment from "./components/home/StudentAssignment";
import { FaGraduationCap, FaStar, FaHeart } from "react-icons/fa";

export default function Home() {
  const { user, loading } = useAuth();

  // Prevent hydration errors by waiting for auth to load
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const isGraduated = user?.semester === "graduated";

  // If the user is a graduated student, show the wishing message
  if (user && isGraduated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden text-center relative mt-10">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 h-32 w-full absolute top-0 left-0"></div>
          
          <div className="px-6 pb-12 pt-16 relative">
            {/* Icon */}
            <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg border-4 border-white mb-6 relative z-10">
              <FaGraduationCap className="text-5xl text-green-600" />
            </div>

            {/* Message */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Congratulations, {user.name}! 🎉
            </h1>
            
            <div className="flex justify-center gap-2 mb-6">
              <FaStar className="text-yellow-400 text-xl" />
              <FaStar className="text-yellow-400 text-xl" />
              <FaStar className="text-yellow-400 text-xl" />
            </div>

            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              You have successfully graduated! We are incredibly proud of your hard work, dedication, and the journey you've completed with us at the Department of BBA.
            </p>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-8 inline-block text-left w-full max-w-lg mx-auto">
              <h3 className="font-semibold text-gray-700 mb-3 text-center uppercase tracking-wider text-sm">
                Your Academic Profile
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong className="text-gray-800">Name:</strong> {user.name}</p>
                <p><strong className="text-gray-800">College ID:</strong> {user.collegeId || "N/A"}</p>
                <p><strong className="text-gray-800">Session:</strong> {user.session || "N/A"}</p>
                <p><strong className="text-gray-800">Status:</strong> <span className="text-green-600 font-semibold uppercase">{user.semester}</span></p>
              </div>
            </div>

            <div className="text-gray-500 italic flex flex-col items-center gap-2">
              <p className="flex items-center gap-2">
                Wishing you the absolute best in your future endeavors!
                <FaHeart className="text-red-400" />
              </p>
              <p className="text-sm mt-4 font-semibold text-gray-400">- BBA Department, Adamjee Cantonment College</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default view for active students
  return (
    <div className="container mx-auto px-4 py-8">
      <MyAttendance/>
      <StudentAssignment/>
      <AssignmentSubmissionToday/>
    </div>
  );
}