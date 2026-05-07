"use client";
import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";

const Links = () => {
  const { user } = useAuth();
  return (
    <div className="text-black">
      {user?.role !== "student" && (
        <div className="w-full flex items-center justify-center gap-4 bg-white rounded-lg shadow-sm p-4 mb-6">
          <Link className="text-white bg-green-800 rounded-xl p-1 px-2 cursor-pointer" href={`/${user?.role}/dashboard`}>
            Dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default Links;
