// app/faculty/list-generator/[userId]/page.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext"; // ✅ Import Auth
import { 
  FiPlus, 
  FiEdit3, 
  FiClock, 
  FiCalendar, 
  FiList, 
  FiSearch,
  FiTrash2,
  FiAlertTriangle,
  FiUser // ✅ Import User Icon
} from "react-icons/fi";
import toast from "react-hot-toast";

// Beautiful color gradients for the cards
const CARD_THEMES = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-fuchsia-600",
  "from-orange-500 to-red-600",
  "from-cyan-500 to-blue-600",
  "from-pink-500 to-rose-600",
];

export default function ListGenerator() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth(); // ✅ Get current user
  
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState(null);
  const [deleteListTitle, setDeleteListTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      // ✅ Changed to the faculty route
      const res = await fetch("/api/faculty/custom-list/get-all");
      const data = await res.json();
      if (data.success) {
        setLists(data.data);
      } else {
        toast.error(data.message || "Failed to load lists");
      }
    } catch (error) {
      toast.error("An error occurred while fetching lists");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    const toastId = toast.loading("Creating list...");

    try {
      // Assuming you have a faculty create route, change if needed
      const res = await fetch("/api/cr/custom-list/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("List created successfully!", { id: toastId });
        setNewTitle("");
        setIsModalOpen(false);
        fetchLists();
      } else {
        toast.error(data.message || "Failed to create list", { id: toastId });
      }
    } catch (error) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = (id, title) => {
    setDeleteListId(id);
    setDeleteListTitle(title);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteList = async () => {
    if (!deleteListId) return;
    
    setIsDeleting(true);
    const toastId = toast.loading("Deleting list...");

    try {
      const res = await fetch(`/api/cr/custom-list/delete?listId=${deleteListId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("List deleted successfully", { id: toastId });
        setIsDeleteModalOpen(false);
        fetchLists();
      } else {
        toast.error(data.message || "Failed to delete", { id: toastId });
      }
    } catch (error) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsDeleting(false);
      setDeleteListId(null);
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredLists = lists.filter((list) =>
    list.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FiList className="text-indigo-600 text-2xl" />
              </div>
              Custom Lists
            </h1>
            <p className="text-gray-500 mt-2 ml-1">
              {user?.role === "admin" 
                ? "View and manage all dynamic lists created across the platform." 
                : "Create dynamic lists for events, fees, or any custom data collection."}
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all hover:shadow-md"
          >
            <FiPlus size={18} />
            Create New List
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search lists by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredLists.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiList className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No lists found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? "No lists match your search." : "You haven't created any custom lists yet."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <FiPlus /> Create your first list
              </button>
            )}
          </div>
        ) : (
          /* Grid of Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLists.map((list, index) => {
              const theme = CARD_THEMES[index % CARD_THEMES.length];
              
              return (
                <div 
                  key={list._id} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col"
                >
                  {/* Colored Top Bar */}
                  <div className={`h-2 w-full bg-gradient-to-r ${theme}`} />
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-2 pr-2 group-hover:text-indigo-600 transition-colors">
                        {list.title}
                      </h3>
                      {/* Delete Button */}
                      <button
                        onClick={() => confirmDelete(list._id, list.title)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Delete List"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>

                    {/* ✅ Show Author if Admin */}
                    {user?.role === "admin" && list.createdBy && (
                      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md w-fit">
                        <FiUser size={12} className="text-gray-500" />
                        Author: {list.createdBy.name}
                      </div>
                    )}

                    {/* Meta Data (Dates) */}
                    <div className="space-y-2 mb-6 text-sm text-gray-500 flex-1">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-gray-400" />
                        <span>Created: {formatDate(list.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="text-gray-400" />
                        <span>Updated: {formatDate(list.updatedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex gap-4">
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                            {list.columns.length} Columns
                          </span>
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                            {list.rows.length} Students
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto flex gap-2">
                      {/* ✅ Adjusted link to route to the faculty edit page if user is faculty/admin */}
                      <Link 
                        href={`/faculty/list-generator/${params.userId}/${list._id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <FiEdit3 size={16} />
                        View / Edit Sheet
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Create New List</h3>
            </div>
            <form onSubmit={handleCreateList} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Annual Picnic 2024, Exam Fees..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  You will be able to add custom columns (like Token Fee, Bus Seat) after creating the sheet.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    "Create List"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle className="text-red-600 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete List?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>"{deleteListTitle}"</strong>? 
              This action cannot be undone and all data in this sheet will be lost.
            </p>
            <div className="flex justify-center gap-3 w-full">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteList}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}