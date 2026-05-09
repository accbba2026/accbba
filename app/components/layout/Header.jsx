// app/components/layout/Header.jsx
"use client";
import React from "react";
import Image from "next/image";
import { useAuth } from "@/app/context/AuthContext";
import ACCLOGO from "../../assets/acclogo.png";
import BBALOGO from "../../assets/bbalogo.png";
import { FiLogOut } from "react-icons/fi";
import Link from "next/link";

const Header = () => {
  const { logout, user } = useAuth();

  // Get last part of name (last word after space)
  const getLastName = (fullName) => {
    if (!fullName) return "Guest";
    const nameParts = fullName.trim().split(" ");
    return nameParts[nameParts.length - 1];
  };

  // Get display name (last name or first name if only one word)
  const getDisplayName = (fullName) => {
    if (!fullName) return "Guest";
    const nameParts = fullName.trim().split(" ");
    if (nameParts.length === 1) return nameParts[0];
    return nameParts[nameParts.length - 1];
  };

  return (
    <header className="w-full bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 md:py-4">
          {/* Left side - ACC College Logo */}
          <div className="flex-shrink-0">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
              <Link href="/">
                <Image
                  src={ACCLOGO}
                  alt="ACC College Logo"
                  sizes="(max-width: 640px) 40px, (max-width: 768px) 56px, (max-width: 1024px) 64px, 80px"
                  fill
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
          </div>

          {/* Center - Department Name */}
          <div className="flex-1 text-center px-2 sm:px-4">
            <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 tracking-tight">
              Department of <span className="text-blue-600">BBA</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
              Bachelor of Business Administration
            </p>
          </div>

          {/* Right side - BBA Logo and User Info */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* BBA Department Logo */}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14">
              <Link href="/">
                <Image
                  src={BBALOGO}
                  alt="BBA Department Logo"
                  fill
                  sizes="(max-width: 640px) 32px, (max-width: 768px) 48px, (max-width: 1024px) 56px, 64px"
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Vertical Divider - hidden on very small screens */}
            <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>

            {/* User Greeting and Logout */}
            <div className="text-right">
              <p className="text-xs sm:text-sm font-medium text-gray-700">
                Hi,{" "}
                <span className="text-blue-600 font-semibold">
                  {getDisplayName(user?.name)}
                </span>
              </p>
              <p className="text-xs text-gray-400">
                ID:{" "}
                <span className="font-mono">
                  {user?.collegeId || user?.userId || "N/A"}
                </span>
              </p>
              <button
                onClick={logout}
                className="text-xs cursor-pointer text-red-500 hover:text-red-700 mt-1 transition-colors flex items-center gap-1 ml-auto"
              >
                <FiLogOut size={12} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
