// app/admin/logs/page.jsx
"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiTrash2,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiDownload,
  FiClock,
  FiUser,
  FiFileText,
} from "react-icons/fi";

const AdminLogsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "all",
    userRole: "all",
    resourceType: "all",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 50 });
  const [availableFilters, setAvailableFilters] = useState({
    actions: [],
    userRoles: [],
    resourceTypes: [],
  });
  
  // Bulk delete state
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState("selected");
  const [deleteDateRange, setDeleteDateRange] = useState({ startDate: "", endDate: "" });
  const [deleteOlderThan, setDeleteOlderThan] = useState(30);
  const [deleting, setDeleting] = useState(false);
  
  // View details modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [jsonParseError, setJsonParseError] = useState(false);
  
  const actionColors = {
    LOGIN: "bg-green-100 text-green-700",
    LOGOUT: "bg-gray-100 text-gray-700",
    PASSWORD_CHANGE: "bg-yellow-100 text-yellow-700",
    ASSIGNMENT_CREATE: "bg-blue-100 text-blue-700",
    ASSIGNMENT_UPDATE: "bg-indigo-100 text-indigo-700",
    ASSIGNMENT_DELETE: "bg-red-100 text-red-700",
    ASSIGNMENT_SUBMIT: "bg-purple-100 text-purple-700",
    ASSIGNMENT_BULK_SUBMIT: "bg-purple-100 text-purple-700",
    ATTENDANCE_MARK: "bg-teal-100 text-teal-700",
    ATTENDANCE_DELETE: "bg-orange-100 text-orange-700",
    COURSE_CREATE: "bg-cyan-100 text-cyan-700",
    USER_CREATE: "bg-emerald-100 text-emerald-700",
    REPORT_GENERATE: "bg-pink-100 text-pink-700",
  };
  
  // Safe JSON parse function
  const safeParseDetails = (details) => {
    if (!details) return { raw: "No details available" };
    
    // If it's already an object, return it
    if (typeof details === 'object') {
      return details;
    }
    
    // If it's a string, try to parse it
    if (typeof details === 'string') {
      try {
        // Check if it looks like JSON (starts with { or [)
        const trimmed = details.trim();
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && 
            (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
          return JSON.parse(details);
        }
        // If it's plain text, return it as is
        return { raw: details };
      } catch (e) {
        console.warn('Failed to parse JSON details:', e);
        return { raw: details, parseError: true };
      }
    }
    
    return { raw: String(details) };
  };
  
  // Get display text for details preview
  const getDetailsPreview = (details) => {
    if (!details) return "No details";
    
    try {
      const parsed = safeParseDetails(details);
      const str = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
      return str.substring(0, 100);
    } catch (e) {
      return String(details).substring(0, 100);
    }
  };
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      
      const response = await fetch(`/api/admin/logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Pre-parse details for all logs to avoid rendering issues
        const processedLogs = data.data.map(log => ({
          ...log,
          parsedDetails: safeParseDetails(log.details)
        }));
        setLogs(processedLogs);
        setPagination(data.pagination);
        setAvailableFilters(data.filters);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user?.role === "admin") {
      fetchLogs();
    }
  }, [user, pagination.page, filters]);
  
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
    setSelectedLogs([]);
  };
  
  const clearFilters = () => {
    setFilters({
      action: "all",
      userRole: "all",
      resourceType: "all",
      startDate: "",
      endDate: "",
      search: "",
    });
    setPagination({ ...pagination, page: 1 });
    setSelectedLogs([]);
  };
  
  const handleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log._id));
    }
  };
  
  const handleSelectLog = (logId) => {
    if (selectedLogs.includes(logId)) {
      setSelectedLogs(selectedLogs.filter(id => id !== logId));
    } else {
      setSelectedLogs([...selectedLogs, logId]);
    }
  };
  
  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      let body = {};
      
      if (deleteOption === "selected") {
        body = { logIds: selectedLogs };
      } else if (deleteOption === "all") {
        body = { deleteAll: true };
      } else if (deleteOption === "dateRange") {
        body = { dateRange: deleteDateRange };
      } else if (deleteOption === "olderThan") {
        body = { olderThan: deleteOlderThan };
      }
      
      const response = await fetch("/api/admin/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully deleted ${data.deletedCount} log(s)`);
        setShowDeleteModal(false);
        setSelectedLogs([]);
        fetchLogs();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Error deleting logs:", error);
      alert("Failed to delete logs");
    } finally {
      setDeleting(false);
    }
  };
  
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return "Invalid date";
    }
  };
  
  const getActionColor = (action) => {
    return actionColors[action] || "bg-gray-100 text-gray-700";
  };
  
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setJsonParseError(false);
    setShowDetailsModal(true);
  };
  
  // Format details for display in modal
  const formatDetailsForDisplay = (details) => {
    if (!details) return "No details available";
    
    try {
      const parsed = safeParseDetails(details);
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed, null, 2);
      }
      return String(parsed);
    } catch (e) {
      return String(details);
    }
  };
  
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 mt-2">Only administrators can view logs.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
              <p className="text-gray-600 mt-1">
                Track and monitor all user activities across the platform
              </p>
            </div>
            <div className="flex gap-2">
              {selectedLogs.length > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <FiTrash2 /> Delete Selected ({selectedLogs.length})
                </button>
              )}
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FiFilter /> Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Search in details..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Actions</option>
              {availableFilters.actions.map(action => (
                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
              ))}
            </select>
            
            <select
              value={filters.userRole}
              onChange={(e) => handleFilterChange("userRole", e.target.value)}
              className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Roles</option>
              {availableFilters.userRoles.map(role => (
                <option key={role} value={role}>{role.toUpperCase()}</option>
              ))}
            </select>
            
            <select
              value={filters.resourceType}
              onChange={(e) => handleFilterChange("resourceType", e.target.value)}
              className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Resources</option>
              {availableFilters.resourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Start Date"
            />
            
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="text-gray-600 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="End Date"
            />
          </div>
        </div>
        
        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedLogs.length === logs.length && logs.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 text-gray-600 py-3 text-left">Timestamp</th>
                  <th className="px-4 text-gray-600 py-3 text-left">User</th>
                  <th className="px-4 text-gray-600 py-3 text-left">Action</th>
                  <th className="px-4 text-gray-600 py-3 text-left">Resource</th>
                  <th className="px-4 text-gray-600 py-3 text-left">Details</th>
                  <th className="px-4 text-gray-600 py-3 text-left w-20">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading logs...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <FiFileText className="text-5xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLogs.includes(log._id)}
                          onChange={() => handleSelectLog(log._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {log.user?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.userRole?.toUpperCase()} | {log.user?.collegeId || log.user?.email || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action?.replace(/_/g, ' ') || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 capitalize">{log.resourceType || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 max-w-md truncate" title={getDetailsPreview(log.details)}>
                          {getDetailsPreview(log.details)}
                          {(getDetailsPreview(log.details).length >= 100) && "..."}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-blue-600 hover:text-blue-700"
                          title="View Details"
                        >
                          <FiEye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition flex items-center gap-1"
                >
                  <FiChevronLeft size={14} /> Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition flex items-center gap-1"
                >
                  Next <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Delete Logs</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Delete Option</label>
                <select
                  value={deleteOption}
                  onChange={(e) => setDeleteOption(e.target.value)}
                  className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="selected">Selected Logs ({selectedLogs.length})</option>
                  <option value="all">All Logs</option>
                  <option value="dateRange">By Date Range</option>
                  <option value="olderThan">Older Than X Days</option>
                </select>
              </div>
              
              {deleteOption === "dateRange" && (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={deleteDateRange.startDate}
                    onChange={(e) => setDeleteDateRange({ ...deleteDateRange, startDate: e.target.value })}
                    className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={deleteDateRange.endDate}
                    onChange={(e) => setDeleteDateRange({ ...deleteDateRange, endDate: e.target.value })}
                    className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="End Date"
                  />
                </div>
              )}
              
              {deleteOption === "olderThan" && (
                <div>
                  <input
                    type="number"
                    value={deleteOlderThan}
                    onChange={(e) => setDeleteOlderThan(parseInt(e.target.value))}
                    className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Days"
                  />
                  <p className="text-xs text-gray-500 mt-1">Delete logs older than {deleteOlderThan} days</p>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <FiAlertCircle /> This action cannot be undone!
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* View Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Log Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Timestamp</label>
                  <p className="text-gray-900">{formatDate(selectedLog?.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Action</label>
                  <p className="text-gray-900">{selectedLog?.action?.replace(/_/g, ' ') || selectedLog?.action}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">User</label>
                  <p className="text-gray-900">{selectedLog?.user?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{selectedLog?.userRole?.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Contact</label>
                  <p className="text-gray-900">{selectedLog?.user?.email || "N/A"}</p>
                  <p className="text-xs text-gray-500">ID: {selectedLog?.user?.collegeId || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Resource Type</label>
                  <p className="text-gray-900 capitalize">{selectedLog?.resourceType || "N/A"}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Resource ID</label>
                  <p className="text-gray-900 text-xs font-mono">{selectedLog?.resourceId || "N/A"}</p>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-2">Details</label>
                <div className="bg-gray-50 rounded-lg p-4 border overflow-x-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs">
                    {formatDetailsForDisplay(selectedLog?.details)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogsPage;