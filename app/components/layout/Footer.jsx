// app/components/layout/Footer.jsx
import React from "react";
import { FaFacebook, FaWhatsapp, FaPhoneAlt, FaUserGraduate } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="relative mt-auto bg-gradient-to-br from-gray-900 via-emerald-950 to-green-950 text-white overflow-hidden">
      {/* Background Glowing Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-green-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10">
          
          {/* Left Side: Issue Reporting & Brand */}
          <div className="text-center md:text-left max-w-md">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <h3 className="text-xl font-bold tracking-wide text-white">
                Department of BBA
              </h3>
            </div>
            <p className="text-sm text-emerald-100/80 leading-relaxed mb-4">
              For any kind of website-related problems, bugs, or issues, please contact the Admin. I am here to help!
            </p>
          </div>

          {/* Right Side: Developer Info */}
          <div className="flex flex-col items-center md:items-end w-full md:w-auto">
            <div className="flex flex-col items-center md:items-end mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <FaUserGraduate className="text-emerald-400 text-lg" />
                <span className="text-base font-semibold tracking-wide text-white">
                  Md Sabbir Hossin Ramjan
                </span>
                {/* 👇 Developer Badge Added Here */}
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-md shadow-lg shadow-emerald-500/30 ml-1">
                  Developer
                </span>
              </div>
              <p className="text-xs text-emerald-100/60 font-medium uppercase tracking-wider text-center md:text-right">
                Student of BBA • Session: 2021-22
              </p>
            </div>

            {/* Contact Links (Glassmorphism Cards) */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
              <a
                href="tel:+8801303934257"
                className="group flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <FaPhoneAlt size={12} className="text-emerald-400 group-hover:text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Call / WhatsApp</span>
                  <span className="text-sm font-medium text-gray-200">+880 1303-934257</span>
                </div>
              </a>

              <div className="flex gap-2">
                <a
                  href="https://wa.me/8801303934257"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-green-500 border border-white/10 hover:border-green-400 rounded-xl text-gray-300 hover:text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/30"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={22} />
                </a>

                <a
                  href="https://www.facebook.com/sabbir183023"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 rounded-xl text-gray-300 hover:text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30"
                  title="Facebook"
                >
                  <FaFacebook size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400 text-center sm:text-left">
            © {new Date().getFullYear()} Department of BBA, Adamjee Cantonment College. All rights reserved.
          </p>
          <p className="text-xs text-emerald-500/70 font-medium flex items-center gap-1">
            Designed & Developed by Md Sabbir Hossin Ramjan <span className="text-red-500 ml-1">♥</span>
          </p>
        </div>
      </div>
    </footer>
  );
}