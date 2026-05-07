"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export default function ReportPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courses, setCourses] = useState([]);

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        body {
          padding: 0;
          margin: 0;
        }
        .print-container {
          padding: 20px;
        }
        table {
          page-break-inside: avoid;
        }
        .course-section {
          page-break-after: always;
        }
        .course-section:last-child {
          page-break-after: auto;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const semester = user?.semester || "1st";
        
        // Fetch courses
        const coursesRes = await fetch(`/api/cr/courses?semester=${semester}`);
        const coursesData = await coursesRes.json();
        if (coursesData.success) setCourses(coursesData.data);
        
        // Fetch assignments
        const assignmentsRes = await fetch(`/api/cr/assignments?semester=${semester}`);
        const assignmentsData = await assignmentsRes.json();
        
        // Fetch students
        const studentsRes = await fetch(`/api/cr/get-students?semester=${semester}`);
        const studentsData = await studentsRes.json();
        
        // Create a map of collegeId to student _id for easy lookup
        const studentIdMap = new Map();
        studentsData.data.forEach(student => {
          studentIdMap.set(student.collegeId, student._id);
          studentIdMap.set(student._id, student._id);
        });
        
        // Fetch submissions for each assignment
        const assignmentIds = assignmentsData.data.map(a => a._id);
        const submissionsPromises = assignmentIds.map(id =>
          fetch(`/api/cr/assignments/submissions?assignmentId=${id}`).then(res => res.json())
        );
        
        const submissionsResults = await Promise.all(submissionsPromises);
        
        // Create a map for quick submission lookup using student _id
        const submissionsMap = new Map();
        submissionsResults.forEach((result, index) => {
          if (result.success && result.data) {
            const assignmentId = assignmentIds[index];
            result.data.forEach(submission => {
              const studentId = submission.student?._id || submission.student;
              const key = `${assignmentId}_${studentId}`;
              submissionsMap.set(key, submission);
              
              if (submission.student?.collegeId) {
                const collegeIdKey = `${assignmentId}_${submission.student.collegeId}`;
                submissionsMap.set(collegeIdKey, submission);
              }
            });
          }
        });
        
        setReportData({
          assignments: assignmentsData.data,
          students: studentsData.data,
          submissionsMap: submissionsMap,
          studentIdMap: studentIdMap,
        });
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchData();
  }, [user]);

  if (loading) return <div className="text-center py-8">Loading report...</div>;
  if (!reportData) return <div className="text-center py-8">No data available</div>;

  const filteredAssignments = selectedCourse
    ? reportData.assignments.filter(a => a.course?._id === selectedCourse)
    : reportData.assignments;

  const groupedByCourse = filteredAssignments.reduce((acc, assignment) => {
    const courseId = assignment.course?._id;
    if (!acc[courseId]) {
      acc[courseId] = {
        courseName: assignment.course?.courseName,
        courseCode: assignment.course?.courseCode,
        assignments: [],
      };
    }
    acc[courseId].assignments.push(assignment);
    return acc;
  }, {});

  const getSubmissionStatus = (assignmentId, student) => {
    let submission = null;
    
    const keyById = `${assignmentId}_${student._id}`;
    submission = reportData.submissionsMap.get(keyById);
    
    if (!submission && student.collegeId) {
      const keyByCollegeId = `${assignmentId}_${student.collegeId}`;
      submission = reportData.submissionsMap.get(keyByCollegeId);
    }
    
    if (!submission) {
      return { text: "", class: "bg-gray-100 text-gray-700" };
    }
    
    const assignment = reportData.assignments.find(a => a._id === assignmentId);
    const subDate = new Date(submission.submittedAt);
    const dueDate = new Date(assignment.submissionDate);
    
    if (subDate <= dueDate) {
      return { text: "On Time", class: "bg-green-100 text-green-700" };
    } else {
      return { text: "Late", class: "bg-red-100 text-red-700" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header with navigation - Hidden when printing */}
        <div className="no-print mb-6 flex justify-between items-center">
          <Link href="/cr/assignments" className="flex items-center gap-2 text-green-600">
            <FiArrowLeft /> Back to Assignments
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Print Report
          </button>
        </div>
        
        {/* Course selector - Hidden when printing */}
        <div className="no-print mb-4">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 text-gray-600 py-2 border rounded-lg"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.courseName} ({course.courseCode})
              </option>
            ))}
          </select>
        </div>
        
        {/* Report Content - This will be printed */}
        <div className="print-container">
          {Object.entries(groupedByCourse).length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg">
              <p className="text-gray-500">No assignments found for the selected course.</p>
            </div>
          ) : (
            Object.entries(groupedByCourse).map(([courseId, courseData], idx) => (
              <div 
                key={courseId} 
                className={`bg-white rounded-lg shadow-lg mb-8 p-6 print:shadow-none print:mb-4 ${idx < Object.entries(groupedByCourse).length - 1 ? 'course-section' : ''}`}
              >
                {/* University Header for Print */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl text-gray-600 font-bold">Assignment Submission Report</h1>
                  <h2 className="text-xl text-gray-600 mt-2">{courseData.courseName} ({courseData.courseCode})</h2>
                  <p className="text-gray-600">Semester: {user?.semester} | Generated: {new Date().toLocaleDateString()}</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-gray-600 border p-2">#</th>
                        <th className="text-gray-600 border p-2">College ID</th>
                        <th className="text-gray-600 border p-2">Student Name</th>
                        {courseData.assignments.map((a, idx) => (
                          <th key={a._id} className="text-gray-600 border p-2">
                            A{idx + 1}<br/>
                            <span className="text-gray-500 text-xs">{new Date(a.submissionDate).toLocaleDateString()}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.students.map((student, idx) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="border text-gray-600 p-2 text-center">{idx + 1}</td>
                          <td className="border text-gray-600 p-2">{student.collegeId || 'N/A'}</td>
                          <td className="border text-gray-600 p-2">{student.name}</td>
                          {courseData.assignments.map(assignment => {
                            const status = getSubmissionStatus(assignment._id, student);
                            return (
                              <td key={assignment._id} className={`border text-gray-600 p-2 text-center ${status.class}`}>
                                {status.text}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}