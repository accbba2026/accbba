// app/components/layout/Header.jsx
"use client";
import React from "react";
import Image from "next/image";
import { useAuth } from "@/app/context/AuthContext";
import ACCLOGO from "../../assets/acclogo.png";
import BBALOGO from "../../assets/bbalogo.png";
import { FiLogOut, FiHome, FiGrid } from "react-icons/fi";
import { FaTint } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Header = () => {
  const { logout, user } = useAuth();
  const pathname = usePathname();

  const getDisplayName = (fullName) => {
    if (!fullName) return "Guest";
    const nameParts = fullName.trim().split(" ");
    if (nameParts.length === 1) return nameParts[0];
    return nameParts[nameParts.length - 1];
  };

  // Build nav items — Dashboard link mirrors the Links component logic
  const navItems = [
    { href: "/", label: "Home", icon: FiHome },
    { href: "/blood", label: "Blood", icon: FaTint },
  ];

  if (user && user?.role !== "student") {
    navItems.push({
      href: `/${user.role}/dashboard`,
      label: "Dashboard",
      icon: FiGrid,
    });
  }

  return (
    <>
      {/* Top Sticky Header */}
      <header className="w-full bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8">
          {/* Top Row - Logos, Title, User Info */}
          <div className="flex items-center justify-between py-2">
            {/* Left - ACC Logo */}
            <div className="flex-shrink-0">
              <Link href="/">
                <div className="relative w-9 h-9 sm:w-11 sm:h-11">
                  <Image
                    src={ACCLOGO}
                    alt="ACC College Logo"
                    sizes="(max-width: 640px) 36px, 44px"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>
            </div>

            {/* Center - Title with subtitle */}
            <div className="flex-1 text-center px-2">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-gray-800 tracking-tight leading-tight">
                Department of <span className="text-blue-600">BBA</span>
              </h1>
              <p className="hidden sm:block text-xs text-gray-500 leading-tight mt-0.5">
                Bachelor of Business Administration
              </p>
            </div>

            {/* Right - BBA Logo + User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                  <Image
                    src={BBALOGO}
                    alt="BBA Department Logo"
                    fill
                    sizes="(max-width: 640px) 32px, 40px"
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>

              <div className="h-7 w-px bg-gray-200 hidden sm:block"></div>

              {/* User info */}
              <div className="flex items-center gap-2">
                <div className="text-right leading-tight">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-700">
                    Hi,{" "}
                    <span className="text-blue-600 font-semibold">
                      {getDisplayName(user?.name)}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono leading-tight">
                    {user?.collegeId || user?.userId || "N/A"}
                  </p>
                </div>
                <button
                  onClick={logout}
                  aria-label="Logout"
                  title="Logout"
                  className="cursor-pointer text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                >
                  <FiLogOut size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Inline Navigation — sm and up only */}
          <nav className="hidden sm:flex items-center justify-center gap-2 pb-1.5 border-t border-gray-100 pt-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center gap-1.5
                    px-4 py-1 rounded-full text-xs font-medium
                    transition-all duration-200 ease-in-out
                    ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    }
                  `}
                >
                  <Icon
                    size={13}
                    className={`transition-transform duration-200 ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation — fixed at bottom of screen */}
      <nav
        className="
          sm:hidden
          fixed bottom-0 left-0 right-0 z-50
          bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]
          flex items-center justify-around
          px-2 py-1.5
          pb-[max(0.375rem,env(safe-area-inset-bottom))]
        "
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-0.5
                flex-1 py-1 rounded-lg
                text-[10px] font-medium
                transition-colors duration-200
                ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-blue-600"
                }
              `}
            >
              <Icon
                size={18}
                className={`
                  transition-transform duration-200
                  ${isActive ? "scale-110" : ""}
                `}
              />
              <span className="leading-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Header;