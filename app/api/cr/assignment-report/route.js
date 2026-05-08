// app/api/cr/assignment-report/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import User from '@/app/models/User';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import Course from '@/app/models/Course';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== 'cr' && currentUser.role !== 'admin')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') || currentUser.semester;
    const courseId = searchParams.get('courseId');

    // 1. Fetch all published assignments for the semester
    const assignmentsQuery = {
      semester: semester,
      status: 'published'
    };
    
    let assignments = await Assignment.find(assignmentsQuery)
      .populate('course', 'courseName courseCode')
      .sort({ submissionDate: 1 });

    // Filter by course if specified
    if (courseId && courseId !== 'all') {
      assignments = assignments.filter(a => a.course?._id.toString() === courseId);
    }

    // 2. Fetch all students and CR for the semester
    const students = await User.find({
      semester: semester,
      role: { $in: ['student', 'cr'] },
      status: 'active',
      collegeId: { $exists: true, $ne: null, $ne: '' }
    })
    .select('name collegeId email phone role semester')
    .sort({ collegeId: 1 });

    // 3. Fetch all courses for the semester
    const courses = await Course.find({ semester }).sort({ courseName: 1 });

    // 4. Fetch all submissions for these assignments
    const assignmentIds = assignments.map(a => a._id);
    const allSubmissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds }
    })
    .populate('student', 'name collegeId email')
    .lean();

    // 5. Organize submissions by assignment and student
    const submissionsMap = new Map();
    allSubmissions.forEach(submission => {
      const assignmentId = submission.assignment.toString();
      const studentId = submission.student?._id?.toString() || submission.student?.toString();
      const key = `${assignmentId}_${studentId}`;
      submissionsMap.set(key, submission);
    });

    // 6. Build organized report data
    const reportData = {
      semester,
      generatedAt: new Date().toISOString(),
      courses: courses.map(course => ({
        _id: course._id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        teacherName: course.teacherName
      })),
      assignments: assignments.map(assignment => ({
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        submissionDate: assignment.submissionDate,
        courseId: assignment.course?._id,
        courseName: assignment.course?.courseName,
        courseCode: assignment.course?.courseCode,
        chapter: assignment.chapter
      })),
      students: students.map(student => ({
        _id: student._id,
        name: student.name,
        collegeId: student.collegeId,
        email: student.email,
        phone: student.phone,
        role: student.role,
        isCR: student.role === 'cr'
      })),
      submissions: Array.from(submissionsMap.entries()).map(([key, submission]) => ({
        key,
        assignmentId: submission.assignment.toString(),
        studentId: submission.student?._id?.toString() || submission.student?.toString(),
        submittedAt: submission.submittedAt,
        status: submission.status,
        gradedBy: submission.gradedBy
      }))
    };

    // 7. Calculate statistics
    const stats = {
      totalStudents: students.length,
      totalAssignments: assignments.length,
      totalSubmissions: allSubmissions.length,
      onTimeSubmissions: allSubmissions.filter(s => s.status === 'onTime').length,
      lateSubmissions: allSubmissions.filter(s => s.status === 'late').length,
      submissionRate: students.length > 0 ? 
        ((allSubmissions.length / (assignments.length * students.length)) * 100).toFixed(1) : 0
    };

    return NextResponse.json({
      success: true,
      data: reportData,
      stats: stats
    });

  } catch (error) {
    console.error('Error generating assignment report:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}