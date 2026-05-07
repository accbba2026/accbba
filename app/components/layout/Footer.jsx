import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <div>
      <Link
        href="/admin/students"
        className="text-gray-700 hover:text-blue-600 transition"
      >
        Manage Students
      </Link>
    </div>
  );
};

export default Footer;
