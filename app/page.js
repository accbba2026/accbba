// app/page.js
"use client";
import AssignmentSubmissionToday from "./components/home/AssignmentSubmissionToday";
import Links from "./components/home/Links";
import MyAttendance from "./components/home/MyAttendance";
import StudentAssignment from "./components/home/StudentAssignment";

export default function Home() {
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Links/>
      <MyAttendance/>
      <StudentAssignment/>
      <AssignmentSubmissionToday/>
    </div>
  );
}