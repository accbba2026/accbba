// app/page.js
"use client";
import Links from "./components/home/Links";
import StudentAssignment from "./components/home/StudentAssignment";

export default function Home() {
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Links/>
      <StudentAssignment/>
    </div>
  );
}