// Report Modal Component
const ReportModal = () => {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/cr/assignments/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: crSemester,
          courseId: selectedCourse,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `assignment-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setShowReportModal(false);
    } catch (error) {
      console.error("Error generating report:", error);
      setMessage({ type: "error", text: "Failed to generate report" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Generate Assignment Report
          </h2>
          <button
            onClick={() => setShowReportModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Select Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full text-gray-600 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseName} ({course.courseCode})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              This will generate a PDF report showing all students and their submission status for all assignments.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={generateReport}
              disabled={generating}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Report"}
            </button>
            <button
              onClick={() => setShowReportModal(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};