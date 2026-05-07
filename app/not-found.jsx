// app/not-found.jsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { FaHome, FaArrowLeft, FaExclamationTriangle } from "react-icons/fa";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-10"></div>
            <FaExclamationTriangle className="w-full h-full text-yellow-500" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-gray-800 mb-4">404</h1>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-gray-700 mb-3">
          Page Not Found
        </h2>

        <p className="text-gray-500 mb-8">
          {"Oops! The page you're looking for doesn't exist or has been moved."}
        </p>

        {/* Navigation Buttons */}
        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            <FaHome className="text-lg" />
            Go to Homepage
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            <FaArrowLeft className="text-lg" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-400 mt-6">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
