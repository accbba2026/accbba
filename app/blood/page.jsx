// app/blood/page.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FaTint,
  FaPhone,
  FaCalendarAlt,
  FaLock,
  FaPlus,
  FaTrashAlt,
  FaTimes,
  FaUserShield,
  FaSearch,
  FaInfoCircle,
  FaCheckCircle,
} from "react-icons/fa";
import { FiLoader, FiChevronDown as FiSelectArrow } from "react-icons/fi";
import toast from "react-hot-toast";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const Blood = () => {
  const { user, refreshUser } = useAuth();
  const currentSemester = user?.semester || "";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Local state for history to ensure instant UI updates
  const [myHistory, setMyHistory] = useState(user?.bloodDonationDates || []);

  // Sync local state if user context changes from elsewhere
  useEffect(() => {
    if (user?.bloodDonationDates) {
      setMyHistory(user.bloodDonationDates);
    }
  }, [user?.bloodDonationDates]);

  // Modal State (Add)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [donationDate, setDonationDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State (Admin Manage)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [managingHistory, setManagingHistory] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Search State (Blood Groups)
  const [selectedGroup, setSelectedGroup] = useState("");
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);

  // Disclaimer/Notice State
  const [showNotice, setShowNotice] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const isAuthorizedRole = ["cr", "admin", "faculty"].includes(user?.role);

  const isBloodGroupMissing =
    user?.role === "student" &&
    (!user?.bloodGroup || user.bloodGroup.trim() === "");

  const isBloodSearchBlocked = isBloodGroupMissing;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);
      try {
        const res = await fetch(
          `/api/user/search?q=${encodeURIComponent(searchQuery)}`,
        );
        const data = await res.json();
        if (data.success && data.users) {
          setSearchResults(data.users);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search failed", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleUserSelect = (u) => {
    setSelectedUser(u);
    setShowDropdown(false);
    setSearchQuery("");
    const sorted = [...(u.bloodDonationDates || [])].sort(
      (a, b) => new Date(b) - new Date(a),
    );
    setManagingHistory(sorted);
  };

  const fetchUsers = async (group, pageNum, isLoadMore = false) => {
    if (!group) return;

    // ✅ guard
    if (isBloodSearchBlocked) {
      toast.error(
        "আপনার নিজের ব্লাড গ্রুপ আপডেট করা নেই, অন্যদের ব্লাড গ্রুপ দেখতে আগে CR এর মাধ্যমে আপনার নিজের ব্লাড গ্রুপ আপডেট করান",
      );
      return;
    }
    setLoading(true);
    if (pageNum === 1) setInitialLoad(true);

    try {
      const res = await fetch(
        `/api/user/blood?bloodGroup=${encodeURIComponent(group)}&semester=${encodeURIComponent(currentSemester)}&page=${pageNum}`,
      );
      const data = await res.json();

      if (!data.success) {
        if (data.code === "BLOOD_GROUP_NOT_SET") {
          toast.error(data.message);
          setUsers([]);
          return;
        }
        toast.error(data.message || "Failed to load users");
        return;
      }

      if (data.success) {
        if (isLoadMore) setUsers((prev) => [...prev, ...data.users]);
        else setUsers(data.users);
        setHasMore(data.pagination.hasMore);
      } else {
        toast.error(data.message || "Failed to load users");
      }
    } catch (error) {
      toast.error("An error occurred while fetching data");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleGroupChange = (e) => {
    const group = e.target.value;
    setSelectedGroup(group);
    setPage(1);
    
    if (group) {
      // 1. Fetch data in background
      fetchUsers(group, 1, false);
      // 2. Show the notice modal and reset agreement
      setShowNotice(true);
      setHasAgreed(false);
    } else {
      setUsers([]);
      setShowNotice(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(selectedGroup, nextPage, true);
  };

  const handleAddHistory = async (e) => {
    e.preventDefault();
    if (!donationDate) return toast.error("Please select a date.");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/blood/update-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationDate }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Donation history added!");

        // 1. Instantly update local state so the UI refreshes before the modal closes
        setMyHistory((prev) => [...prev, donationDate]);

        setDonationDate("");
        setIsModalOpen(false);

        // 2. Refresh context in background
        if (refreshUser) refreshUser().catch(console.error);

        // 3. Refresh list if a blood group is currently selected
        if (selectedGroup) fetchUsers(selectedGroup, 1, false);
      } else {
        toast.error(data.message || "Failed to add history");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHistory = async (dateToDelete) => {
    if (!selectedUser || isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/user/blood/delete-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUser._id,
          donationDate: dateToDelete,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Record deleted successfully");

        // 1. Update managing modal state
        setManagingHistory(data.bloodDonationDates);
        setSelectedUser({
          ...selectedUser,
          bloodDonationDates: data.bloodDonationDates,
        });

        // 2. If deleting own history from the main page, update instantly
        if (selectedUser._id === user.id) {
          setMyHistory(data.bloodDonationDates);
          if (refreshUser) refreshUser().catch(console.error);
        }

        // 3. Refresh list if a blood group is currently selected
        if (selectedGroup) fetchUsers(selectedGroup, 1, false);
      } else {
        toast.error(data.message || "Failed to delete record");
      }
    } catch (error) {
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  const getDonationStatus = (dates) => {
    if (!dates || dates.length === 0) {
      return {
        text: "No records",
        textColor: "text-gray-500",
        borderColor: "border-gray-100",
      };
    }
    const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a));
    const lastDate = new Date(sortedDates[0]);
    const now = new Date();
    const diffInDays = Math.floor((now - lastDate) / (1000 * 3600 * 24));

    let timeText = "";
    if (diffInDays === 0) timeText = "Today";
    else if (diffInDays === 1) timeText = "Yesterday";
    else if (diffInDays < 30) timeText = `${diffInDays} days ago`;
    else {
      const diffInMonths = Math.floor(diffInDays / 30.44);
      if (diffInMonths === 1) timeText = "1 month ago";
      else if (diffInMonths < 12) timeText = `${diffInMonths} months ago`;
      else {
        const diffInYears = Math.floor(diffInMonths / 12);
        timeText =
          diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
      }
    }
    const isAvailable = diffInDays > 90;
    return {
      text: timeText,
      textColor: isAvailable ? "text-green-600" : "text-red-600",
      borderColor: isAvailable ? "border-green-500" : "border-red-500",
    };
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const today = new Date().toISOString().split("T")[0];

  if (mounted && isBloodSearchBlocked) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
            <FaLock className="text-red-500" size={26} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
            <FaTint className="text-red-600" /> ব্লাড গ্রুপ আপডেট করুন
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            আপনার নিজের ব্লাড গ্রুপ আপডেট করা নেই, অন্যদের ব্লাড গ্রুপ দেখতে আগে
            CR এর মাধ্যমে আপনার নিজের ব্লাড গ্রুপ আপডেট করান, অথবা একদম নিচে
            এডমিনের সাথে যোগাযোগ করুন
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/contact"
              className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
            >
              এডমিনের সাথে যোগাযোগ করুন
            </a>
            <a
              href="/profile"
              className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
            >
              প্রোফাইলে যান
            </a>
          </div>
          <p className="text-[11px] text-gray-400 mt-6 italic">
            * You will be able to search donors and add donation records once
            your blood group is set by your CR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <FaTint className="text-red-600" /> Blood Group of Students
        </h1>
        <p className="text-gray-500 mt-1 text-xs sm:text-sm">
          Find and connect with donors from the Department of BBA.
          <br className="sm:hidden" /> Your semester donors are shown first.
        </p>
      </div>

      {/* My Blood Donation History Section */}
      {user && (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FaCalendarAlt className="text-red-500" />
              My Donation History
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <FaPlus size={10} /> Add Record
            </button>
          </div>

          <div className="p-4">
            {myHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">
                You have not added any donation history yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...myHistory]
                  .sort((a, b) => new Date(b) - new Date(a))
                  .map((date, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      <span>{formatDate(date)}</span>
                      <button
                        onClick={() => {
                          if (isAuthorizedRole) {
                            setSelectedUser(user);
                            handleDeleteHistory(date);
                          } else {
                            toast.error(
                              "Contact your CR to delete blood giving history.",
                              {
                                icon: "🚫",
                                style: {
                                  borderRadius: "10px",
                                  background: "#333",
                                  color: "#fff",
                                },
                              },
                            );
                          }
                        }}
                        className="text-red-400 hover:text-red-700 transition-colors"
                        title={
                          isAuthorizedRole ? "Delete" : "Contact CR to delete"
                        }
                      >
                        <FaTrashAlt size={10} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role-Based Admin Search Trigger */}
      {isAuthorizedRole && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <FaUserShield /> Manage Student Histories
          </button>
        </div>
      )}

      {/* Blood Group Selector Dropdown */}
      <div className="flex justify-center mb-8">
        <div className="relative w-full max-w-xs">
          <select
            value={selectedGroup}
            onChange={handleGroupChange}
            className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-sm text-sm font-medium cursor-pointer transition-all"
          >
            <option value="" disabled>
              Select Blood Group to Search
            </option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <FiSelectArrow size={18} />
          </div>
        </div>
      </div>

      {/* Notice / Disclaimer Modal Overlay */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
              <FaInfoCircle className="text-red-600 text-xl shrink-0" />
              <h3 className="text-lg font-bold text-red-800">
                নির্দেশিকা (Notice)
              </h3>
            </div>
            
            <div className="p-6">
              <ul className="space-y-3 text-sm text-gray-700 leading-relaxed list-decimal list-inside marker:text-red-500 marker:font-bold">
                <li>চেষ্টা করুন যারা আগে ব্লাড দিয়েছে, এমন ব্যক্তিকে যোগাযোগ করার।</li>
                <li>মেয়েরা সাধারণত ব্লাড দেয়না, নির্দিষ্ট মেয়ে শিক্ষার্থীকে না চিনে থাকলে তাদের যোগাযোগ করা থেকে বিরত থাকুন।</li>
                <li>শুধুমাত্র নিকটাত্মীয়দের প্রয়োজনে ব্লাড দেওয়ার জন্য যোগাযোগ করুন। যেমনঃ বাবা, মা, ভাই, বোন, দাদা, দাদী, নানা, নানী।</li>
                <li>আপনি চিনেন না এমন ব্যক্তিদের ব্লাড দেওয়ার জন্য এখান থেকে কাউকে যোগাযোগ করবেন না।</li>
                <li>আপনি নিজে ব্লাড দিতে চাইলে ও নিকটাত্মিয়দের ব্যতিত ব্লাড দিবেন না।</li>
                <li>কেউ ব্লাড না দিতে চাইলে তাকে কোন প্রকার ব্যতিক্রম উপায়ে প্ররোচিত করবেন না।</li>
              </ul>
              
              <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAgreed}
                    onChange={(e) => setHasAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-800 select-none">
                    I read and agree to the conditions
                  </span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNotice(false);
                    setSelectedGroup("");
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowNotice(false)}
                  disabled={!hasAgreed}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaCheckCircle /> Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blur Overlay for Data if Notice is Showing (Optional visual effect, ensures they can't sneakily click data) */}
      <div className={`transition-all duration-500 ${showNotice ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
        
        {/* List Loaders and States */}
        {initialLoad && (
          <div className="flex justify-center items-center py-20">
            <FiLoader className="animate-spin text-red-600" size={28} />
          </div>
        )}

        {!initialLoad && selectedGroup && users.length === 0 && !showNotice && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <FaTint className="mx-auto text-gray-300 mb-3" size={40} />
            <h3 className="text-sm font-medium text-gray-700">No donors found</h3>
            <p className="text-xs text-gray-500 mt-1">
              There are no active donors with {selectedGroup} blood group.
            </p>
          </div>
        )}

        {!selectedGroup && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-3">
              <FaTint className="text-red-300" size={32} />
            </div>
            <h3 className="text-sm font-medium text-gray-700">
              Select a blood group
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Choose a blood group above to find available donors.
            </p>
          </div>
        )}

        {/* User List */}
        <div className="space-y-3">
          {mounted &&
            users.map((u, index) => {
              const isSameSem = u.semester === currentSemester;
              const donationStatus = getDonationStatus(u.bloodDonationDates);
              const isPhoneHidden = u.phone === "hidden";
              const isFirstOtherSem =
                index > 0 &&
                users[index - 1].semester === currentSemester &&
                !isSameSem;

              return (
                <React.Fragment key={u._id}>
                  {isFirstOtherSem && (
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                          Other Semesters
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    className={`bg-white rounded-xl shadow-sm border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow ${donationStatus.borderColor}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {u.name}
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                          {u.bloodGroup}
                        </span>
                        {isSameSem && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                            Your Semester
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>Session: {u.session || "N/A"}</span>
                        <span>•</span>
                        <span>Sem: {u.semester || "N/A"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider">
                          Last Donated
                        </p>
                        <p
                          className={`text-[11px] font-semibold flex items-center gap-1 sm:justify-end mt-0.5 ${donationStatus.textColor}`}
                        >
                          <FaCalendarAlt size={9} />
                          {donationStatus.text}
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-center">
                        {isPhoneHidden ? (
                          <>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-400 font-medium text-xs cursor-not-allowed select-none">
                              <FaLock size={10} /> Hidden
                            </div>
                            <span className="text-[9px] text-gray-400 text-right mt-1 max-w-[150px] leading-tight">
                              Contact your CR or College authority for this
                              number.
                            </span>
                          </>
                        ) : u.phone ? (
                          <a
                            href={`tel:${u.phone}`}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 font-medium text-xs hover:bg-green-100 transition-colors"
                          >
                            <FaPhone size={10} /> {u.phone}
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            No phone
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
        </div>

        {hasMore && !showNotice && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-5 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-full shadow-sm hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" /> Loading...
                </>
              ) : (
                "আরও দেখুন ->"
              )}
            </button>
          </div>
        )}

        {!hasMore && users.length > 0 && !initialLoad && !showNotice && (
          <p className="text-center text-gray-400 text-[11px] mt-6 pb-4">
            You've reached the end of the list.
          </p>
        )}
      </div>

      {/* --- ADD HISTORY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                Add Donation Record
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              >
                <FaTimes size={16} />
              </button>
            </div>
            <form onSubmit={handleAddHistory} className="p-4">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Date of Donation
                </label>
                <input
                  type="date"
                  value={donationDate}
                  max={today}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5 outline-none"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !donationDate}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    "Save Record"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN MANAGE HISTORY MODAL (FULL PAGE) --- */}
      {isManageModalOpen && isAuthorizedRole && (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm shrink-0">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <FaUserShield /> Manage Student Histories
            </h3>
            <button
              onClick={() => setIsManageModalOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FaTimes size={16} /> Close
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
              {/* Custom Search Input */}
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Student (Name, ID, Phone, or Blood Group)
              </label>

              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="Type at least 2 characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) setShowDropdown(true);
                    }}
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FiLoader className="animate-spin text-indigo-500" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {isSearching && searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No users found.
                      </div>
                    ) : (
                      <ul className="py-2">
                        {searchResults.map((u) => (
                          <li
                            key={u._id}
                            onClick={() => handleUserSelect(u)}
                            className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 text-sm">
                                {u.name}
                              </span>
                              <span className="text-xs text-gray-500 mt-0.5">
                                ID: {u.collegeId || "N/A"} •{" "}
                                {u.bloodGroup || "No BG"} • Sem{" "}
                                {u.semester || "N/A"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Managing History List */}
              {selectedUser && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {selectedUser.name}'s Records
                    </h4>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                      ID: {selectedUser.collegeId || "N/A"}
                    </span>
                  </div>

                  {managingHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No donation history found for this user.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {managingHistory.map((date, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white border border-gray-200 p-3.5 rounded-xl shadow-sm hover:border-red-200 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                              <FaCalendarAlt />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {formatDate(date)}
                              </p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                Donated
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteHistory(date)}
                            disabled={isDeleting}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-xs font-semibold rounded-lg border border-red-100 hover:border-red-600 transition-all disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <FiLoader className="animate-spin" />
                            ) : (
                              <FaTrashAlt />
                            )}{" "}
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blood;