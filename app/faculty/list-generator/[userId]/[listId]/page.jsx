// app/faculty/list-generator/[userId]/[listId]/page.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiEdit2,
  FiUserPlus,
  FiX,
  FiCheck,
  FiUsers,
  FiDatabase,
  FiPrinter,
  FiChevronDown,
} from "react-icons/fi";
import toast from "react-hot-toast";
import DeptLogo from "../../../../assets/bbalogo.png";
import CollegeLogo from "../../../../assets/acclogo.png";

// ✅ Available User Fields to auto-fill
const USER_FIELDS = [
  { label: "Name", field: "name" },
  { label: "College ID", field: "collegeId" },
  { label: "Phone", field: "phone" },
  { label: "Session", field: "session" },
  { label: "Email", field: "email" },
  { label: "Blood Group", field: "bloodGroup" },
  { label: "Major", field: "major" },
  { label: "Semester", field: "semester" },
];

const SEMESTERS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

export default function SingleList() {
  const params = useParams();
  const router = useRouter();
  const listId = params.listId;

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // ✅ Semester Dropdown State
  const [isSemesterDropdownOpen, setIsSemesterDropdownOpen] = useState(false);
  const semesterDropdownRef = useRef(null);

  // Column addition state
  const [newColumnName, setNewColumnName] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // ✅ Auto Fill State
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState([]);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Meta edit state (Title/Subtitles)
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaData, setMetaData] = useState({
    title: "",
    firstSubtitle: "",
    secondSubtitle: "",
  });

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [listId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (
        semesterDropdownRef.current &&
        !semesterDropdownRef.current.contains(event.target)
      ) {
        setIsSemesterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/cr/search-all-students?q=${encodeURIComponent(searchQuery)}`,
        );
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
      } catch (error) {
        console.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/faculty/custom-list/get-single?listId=${listId}`,
      );
      const data = await res.json();
      if (data.success) {
        setList(data.data);
        setMetaData({
          title: data.data.title || "",
          firstSubtitle: data.data.firstSubtitle || "",
          secondSubtitle: data.data.secondSubtitle || "",
        });
      } else {
        toast.error(data.message || "Failed to load list");
        router.push(`/faculty/list-generator/${params.userId}`);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateList = async (action, payload = {}) => {
    try {
      const res = await fetch("/api/faculty/custom-list/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, action, payload }),
      });
      const data = await res.json();
      if (data.success) {
        if (action !== "UPDATE_CELL") {
          fetchList();
        }
      } else {
        toast.error(data.message || "Failed to update");
      }
    } catch (error) {
      toast.error("An error occurred while updating");
    }
  };

  // --- ACTIONS ---
  const handleMetaSave = async () => {
    await updateList("UPDATE_META", metaData);
    setIsEditingMeta(false);
    toast.success("Details updated");
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    await updateList("ADD_COLUMN", { columnName: newColumnName.trim() });
    setNewColumnName("");
    setIsAddingColumn(false);
  };

  const handleRemoveColumn = async (colName) => {
    if (!window.confirm(`Delete the entire "${colName}" column?`)) return;
    await updateList("REMOVE_COLUMN", { columnName: colName });
  };

  const handleAddStudent = async (studentId) => {
    await updateList("ADD_STUDENT", { studentId });
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  // ✅ New Handle Add Specific Semester
  const handleAddSpecificSemester = async (semester) => {
    if (
      !window.confirm(
        `Add all students from ${semester} semester who aren't already in the list?`
      )
    )
      return;
    setIsBulkAdding(true);
    setIsSemesterDropdownOpen(false);
    await updateList("ADD_SPECIFIC_SEMESTER", { semester });
    setIsBulkAdding(false);
    toast.success(`${semester} semester students added!`);
  };

  const handleAddManualRow = async () => {
    await updateList("ADD_MANUAL_ROW", { name: searchQuery });
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleRemoveRow = async (rowId) => {
    if (!window.confirm("Remove this row?")) return;
    await updateList("REMOVE_ROW", { rowId });
  };

  const handleCellChange = async (rowId, columnName, value) => {
    setList((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r._id === rowId
          ? { ...r, cells: { ...r.cells, [columnName]: value } }
          : r,
      ),
    }));

    try {
      const res = await fetch("/api/faculty/custom-list/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          action: "UPDATE_CELL",
          payload: { rowId, columnName, value },
        }),
      });
      const data = await res.json();
      if (!data.success) toast.error("Failed to save cell");
    } catch (error) {
      toast.error("Failed to save cell");
    }
  };

  // ✅ Handle Auto Fill
  const handleToggleField = (fieldObj) => {
    setSelectedFields((prev) => {
      const exists = prev.find((f) => f.field === fieldObj.field);
      if (exists) return prev.filter((f) => f.field !== fieldObj.field);
      return [...prev, fieldObj];
    });
  };

  const handleAutoFillSubmit = async () => {
    if (selectedFields.length === 0) return;
    setIsAutoFilling(true);

    try {
      for (const fieldObj of selectedFields) {
        await fetch("/api/faculty/custom-list/edit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId,
            action: "ADD_USER_FIELD",
            payload: { fieldName: fieldObj.field, fieldLabel: fieldObj.label },
          }),
        });
      }

      toast.success("Columns added and data populated!");
      setIsAutoFillModalOpen(false);
      setSelectedFields([]);
      fetchList();
    } catch (error) {
      toast.error("Failed to auto-fill data");
    } finally {
      setIsAutoFilling(false);
    }
  };

  // ✅ Handle Print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      window.alert("Please allow popups to print.");
      return;
    }

    const rowsHtml = list.rows
      .map((row, idx) => {
        const cellsHtml = list.columns
          .map((col) => {
            return `<td>${row.cells?.[col] || "—"}</td>`;
          })
          .join("");

        return `
        <tr>
          <td class="sl">${idx + 1}</td>
          ${cellsHtml}
        </tr>`;
      })
      .join("");

    const headersHtml = list.columns.map((col) => `<th>${col}</th>`).join("");
    const collegeLogoUrl = CollegeLogo.src;
    const deptLogoUrl = DeptLogo.src;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - ${list.title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              padding: 24px;
              color: #111;
            }
            .print-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #4f46e5;
            }
            .print-logo { width: 85px; height: 85px; object-fit: contain; }
            .print-title-center { text-align: center; flex: 1; padding: 0 20px; }
            .print-title-center h1 { margin: 0; color: #111; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
            .print-title-center h2 { margin: 4px 0 0; font-size: 16px; font-weight: 500; color: #444; }
            .print-subtitle { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e7eb; }
            .print-subtitle h3 { margin: 0; font-size: 16px; font-weight: 700; color: #4f46e5; }
            .print-subtitle p { margin: 2px 0 0; font-size: 13px; color: #666; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; color: #444; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            thead { background: #4f46e5; color: white; }
            th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
            th { font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
            tbody tr:nth-child(even) { background: #f9fafb; }
            td.sl { width: 40px; text-align: center; }
            .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            @media print {
              body { padding: 12px; }
              thead { background: #4f46e5 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img src="${collegeLogoUrl}" class="print-logo" alt="College Logo" />
            <div class="print-title-center">
              <h1>Adamjee Cantonment College</h1>
              <h2>Department of BBA</h2>
              ${
                list.title || list.firstSubtitle || list.secondSubtitle
                  ? `
                <div class="print-subtitle">
                  <h3>${list.title || ""}</h3>
                  ${list.firstSubtitle ? `<p>${list.firstSubtitle}</p>` : ""}
                  ${list.secondSubtitle ? `<p>${list.secondSubtitle}</p>` : ""}
                </div>
              `
                  : ""
              }
            </div>
            <img src="${deptLogoUrl}" class="print-logo" alt="Department Logo" />
          </div>
          <div class="meta">
            <span>Total Students: <strong>${list.rows.length}</strong></span>
          </div>
          <table>
            <thead>
              <tr>
                <th class="sl">SL</th>
                ${headersHtml}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Department of BBA • Adamjee Cantonment College</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading || !list) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header & Top Action Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sm:py-4 sm:px-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push(`/faculty/list-generator/${params.userId}`)}
              className="p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                {list.title}
                <button
                  onClick={() => setIsEditingMeta(!isEditingMeta)}
                  className="text-indigo-500 hover:text-indigo-700 p-1"
                >
                  <FiEdit2 size={14} className="sm:w-4 sm:h-4" />
                </button>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                {list.rows.length} Students listed
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ✅ Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <FiPrinter size={14} className="sm:w-4 sm:h-4" /> Print
            </button>

            {/* ✅ Semester Dropdown Button */}
            <div className="relative" ref={semesterDropdownRef}>
              <button
                onClick={() => setIsSemesterDropdownOpen(!isSemesterDropdownOpen)}
                disabled={isBulkAdding}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <FiUsers size={14} className="sm:w-4 sm:h-4" />
                {isBulkAdding ? "Adding..." : "Add By Semester"}
                <FiChevronDown size={14} className="ml-1" />
              </button>

              {isSemesterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                  {SEMESTERS.map((sem) => (
                    <button
                      key={sem}
                      onClick={() => handleAddSpecificSemester(sem)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {sem} Semester
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={searchRef}>
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <FiUserPlus size={14} className="sm:w-4 sm:h-4" /> Add Student
              </button>

              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-[90vw] sm:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-gray-900 pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        autoFocus
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {searchQuery &&
                      searchResults.length === 0 &&
                      !isSearching && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No students found.
                        </div>
                      )}

                    {searchResults.map((s) => {
                      const isAlreadyAdded = list?.rows?.some(
                        (r) => r.studentId?._id === s._id,
                      );
                      if (isAlreadyAdded) return null;

                      return (
                        <button
                          key={s._id}
                          onClick={() => handleAddStudent(s._id)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex flex-col border-b border-gray-50 last:border-0 transition-colors"
                        >
                          <span className="text-sm font-semibold text-gray-800">
                            {s.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ID: {s.collegeId} • Sem: {s.semester || "N/A"}
                          </span>
                        </button>
                      );
                    })}

                    {searchQuery.length > 0 && (
                      <button
                        onClick={handleAddManualRow}
                        className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center gap-2 border-t border-indigo-100 transition-colors"
                      >
                        <FiPlus /> Add "{searchQuery}" as a manual row
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meta Editing Panel */}
      {isEditingMeta && (
        <div className="bg-indigo-50 border-b border-indigo-100 p-3 sm:p-4 relative z-30">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-indigo-900 mb-1">
                Title
              </label>
              <input
                type="text"
                value={metaData.title}
                onChange={(e) =>
                  setMetaData({ ...metaData, title: e.target.value })
                }
                className="w-full text-gray-900 px-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-indigo-900 mb-1">
                Subtitle 1
              </label>
              <input
                type="text"
                value={metaData.firstSubtitle}
                onChange={(e) =>
                  setMetaData({ ...metaData, firstSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 text-gray-900 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-indigo-900 mb-1">
                Subtitle 2
              </label>
              <input
                type="text"
                value={metaData.secondSubtitle}
                onChange={(e) =>
                  setMetaData({ ...metaData, secondSubtitle: e.target.value })
                }
                className="w-full px-3 py-2 text-gray-900 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              onClick={handleMetaSave}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <FiCheck /> Save
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-2 sm:p-6">
        <div className="max-w-full mx-auto bg-white rounded-lg sm:rounded-xl shadow border border-gray-200 min-w-max relative">
          {/* Table Header */}
          <div className="flex bg-gray-50 border-b border-gray-200">
            <div className="flex-none w-10 sm:w-16 px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-r border-gray-200 flex items-center justify-center">
              SL
            </div>

            {list.columns.map((col) => (
              <div
                key={col}
                className="flex-none w-28 sm:w-40 px-2 sm:px-4 py-2 sm:py-3 group relative border-r border-gray-200 flex items-center justify-between"
              >
                <span
                  className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-wider truncate"
                  title={col}
                >
                  {col}
                </span>
                <button
                  onClick={() => handleRemoveColumn(col)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                  title="Delete Column"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}

            {/* Add Column / Auto-Fill Section */}
            <div className="flex-none w-[220px] sm:w-[340px] flex items-center justify-start px-1 sm:px-2 border-r border-gray-200 gap-1 sm:gap-2">
              {isAddingColumn ? (
                <form
                  onSubmit={handleAddColumn}
                  className="flex items-center w-full gap-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Col Name"
                    className="flex-1 w-full px-1.5 sm:px-2 py-1 text-gray-900 text-[10px] sm:text-sm border border-indigo-300 rounded focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1 text-green-600 bg-green-50 hover:bg-green-100 rounded transition"
                  >
                    <FiCheck size={14} className="sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingColumn(false)}
                    className="p-1 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition"
                  >
                    <FiX size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded sm:rounded-lg transition-colors text-[10px] sm:text-sm font-medium shrink-0"
                    title="Add Empty Column"
                  >
                    <FiPlus size={12} className="sm:w-4 sm:h-4" /> Add Col
                  </button>
                  <button
                    onClick={() => setIsAutoFillModalOpen(true)}
                    className="flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded sm:rounded-lg transition-colors text-[10px] sm:text-sm font-medium shrink-0"
                    title="Auto-fill from Database"
                  >
                    <FiDatabase size={12} className="sm:w-4 sm:h-4" /> Auto
                  </button>
                </>
              )}
            </div>

            <div className="flex-none w-8 sm:w-12 bg-gray-50"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {list.rows.map((row, idx) => (
              <div
                key={row._id}
                className="flex hover:bg-blue-50/30 group transition-colors"
              >
                {/* SL */}
                <div className="flex-none w-10 sm:w-16 border-r border-gray-100 p-0">
                  <input
                    type="text"
                    defaultValue={
                      row.cells?.["SL"] !== undefined
                        ? row.cells["SL"]
                        : idx + 1
                    }
                    onBlur={(e) =>
                      handleCellChange(row._id, "SL", e.target.value)
                    }
                    className="w-full text-center h-full px-1 sm:px-2 py-1.5 sm:py-2 text-[10px] sm:text-sm text-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                  />
                </div>

                {/* Dynamic Cells */}
                {list.columns.map((col) => (
                  <div
                    key={`${row._id}-${col}`}
                    className="flex-none w-28 sm:w-40 border-r border-gray-100 p-0"
                  >
                    <input
                      type="text"
                      key={row.cells?.[col] || "empty"}
                      defaultValue={row.cells?.[col] || ""}
                      onBlur={(e) =>
                        handleCellChange(row._id, col, e.target.value)
                      }
                      className="w-full text-gray-900 h-full px-1.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 placeholder-gray-300"
                      placeholder="..."
                    />
                  </div>
                ))}

                <div className="flex-none w-[220px] sm:w-[340px] border-r border-gray-100 bg-gray-50/30"></div>

                {/* Delete Row Button */}
                <div className="flex-none w-8 sm:w-12 px-1 sm:px-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemoveRow(row._id)}
                    className="p-1 sm:p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Remove Row"
                  >
                    <FiTrash2 size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto Fill Modal */}
      {isAutoFillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiDatabase className="text-emerald-600" /> Auto-Fill Data
              </h3>
              <button
                onClick={() => setIsAutoFillModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">
                Select the data you want to automatically pull from the student
                database and add as a column.
              </p>

              <div className="space-y-3">
                {USER_FIELDS.map((fieldObj) => {
                  const isSelected = selectedFields.some(
                    (f) => f.field === fieldObj.field,
                  );
                  const isAlreadyColumn = list.columns.includes(fieldObj.label);

                  return (
                    <label
                      key={fieldObj.field}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAlreadyColumn
                          ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                          : isSelected
                            ? "bg-emerald-50 border-emerald-200"
                            : "hover:bg-gray-50 border-gray-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isAlreadyColumn}
                        checked={isSelected || isAlreadyColumn}
                        onChange={() => handleToggleField(fieldObj)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-800 block">
                          {fieldObj.label}
                        </span>
                        {isAlreadyColumn && (
                          <span className="text-xs text-gray-500">
                            Already added
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoFillModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAutoFillSubmit}
                disabled={isAutoFilling || selectedFields.length === 0}
                className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAutoFilling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Fetching...
                  </>
                ) : (
                  <>Add {selectedFields.length} Column(s)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}