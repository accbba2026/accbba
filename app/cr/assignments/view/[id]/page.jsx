"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiDownload,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";

export default function PDFViewerPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cr/assignments/${id}`);
        const data = await response.json();

        if (data.success) {
          setAssignment(data.data);
          setError(null);
        } else {
          setError(data.message || "Assignment not found");
        }
      } catch (err) {
        console.error("Error fetching assignment:", err);
        setError("Failed to load assignment. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAssignment();
    }
  }, [id]);

  // Handle PDF load error
  const handlePdfError = () => {
    setPdfError(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading assignment...</p>
        </div>
      </div>
    );
  }

  // Error state - Assignment not found
  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <FiAlertCircle className="text-red-600 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assignment Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error ||
              "The assignment you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Link
            href="/cr/assignments"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiArrowLeft /> Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  // Success state - Show PDF
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <Link
            href="/cr/assignments"
            className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
          >
            <FiArrowLeft /> Back to Assignments
          </Link>
          <div className="flex gap-2 w-full sm:w-auto">
            <a
              href={assignment.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiFileText /> Open in New Tab
            </a>
            <a
              href={assignment.pdfUrl}
              download
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload /> Download PDF
            </a>
          </div>
        </div>

        {/* Assignment Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {assignment.title}
          </h1>
          <p className="text-gray-600 mb-3">{assignment.description}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="text-gray-600 font-semibold">📚 Course: {assignment.course?.courseName || "N/A"}</span>
            {assignment.dueDate && (
              <span className="text-gray-600 font-semibold">
                📅 Due:{" "}
                {new Date(assignment.dueDate).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {assignment.chapter && (
              <span className="text-gray-600 font-semibold">📖 Chapter: {assignment.chapter}</span>
            )}
            <span className="text-gray-600 font-semibold">
              ⌛ Submission:{" "}
              {new Date(assignment.submissionDate).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
                weekday: "long",
              })}
            </span>
          </div>
        </div>

        {/* PDF Viewer with fallback options */}
        {assignment.pdfUrl ? (
          !pdfError ? (
            <div
              className="bg-white rounded-lg shadow-lg overflow-hidden"
              style={{ height: "calc(100vh - 240px)" }}
            >
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(assignment.pdfUrl)}&embedded=true`}
                className="w-full h-full"
                title={assignment.title}
                onError={handlePdfError}
              />
            </div>
          ) : (
            // Fallback when iframe fails
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <FiAlertCircle className="text-yellow-600 text-5xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cannot Preview PDF
              </h3>
              <p className="text-gray-600 mb-4">
                The PDF cannot be displayed in the browser due to security
                restrictions.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={assignment.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FiFileText /> Open in New Tab
                </a>
                <a
                  href={assignment.pdfUrl}
                  download
                  className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FiDownload /> Download PDF
                </a>
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600">
              No PDF file available for this assignment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
