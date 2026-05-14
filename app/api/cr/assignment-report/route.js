// app/api/cr/assignment-report/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import User from '@/app/models/User';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import Course from '@/app/models/Course';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== 'cr' && currentUser.role !== 'admin')) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "REPORT_GENERATE",
        resourceType: "report",
        details: JSON.stringify({
          action: "Unauthorized Report Access",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedAccess: "Assignment Report",
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester') || currentUser.semester;
    const courseId = searchParams.get('courseId');

    // Log report generation attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "REPORT_GENERATE",
      resourceType: "report",
      details: JSON.stringify({
        action: "Report Generation Started",
        generatedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          semester: currentUser.semester
        },
        reportParams: {
          semester: semester,
          courseId: courseId || 'all',
          timestamp: new Date().toISOString()
        }
      })
    });

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
      const originalCount = assignments.length;
      assignments = assignments.filter(a => a.course?._id.toString() === courseId);
      
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "REPORT_GENERATE",
        resourceType: "report",
        details: JSON.stringify({
          action: "Course Filter Applied",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          filterDetails: {
            courseId: courseId,
            originalAssignmentCount: originalCount,
            filteredAssignmentCount: assignments.length
          }
        })
      });
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

    // 8. Calculate per-student submission statistics for detailed logging
    const studentSubmissionStats = students.map(student => {
      const studentSubmissions = allSubmissions.filter(s => 
        (s.student?._id?.toString() || s.student?.toString()) === student._id.toString()
      );
      return {
        studentId: student._id,
        studentName: student.name,
        collegeId: student.collegeId,
        totalSubmissions: studentSubmissions.length,
        onTimeSubmissions: studentSubmissions.filter(s => s.status === 'onTime').length,
        lateSubmissions: studentSubmissions.filter(s => s.status === 'late').length,
        submissionPercentage: assignments.length > 0 ? 
          ((studentSubmissions.length / assignments.length) * 100).toFixed(1) : 0
      };
    });

    // 9. Calculate per-assignment submission statistics
    const assignmentSubmissionStats = assignments.map(assignment => {
      const assignmentSubmissions = allSubmissions.filter(s => 
        s.assignment.toString() === assignment._id.toString()
      );
      return {
        assignmentId: assignment._id,
        assignmentTitle: assignment.title,
        courseName: assignment.course?.courseName,
        totalSubmissions: assignmentSubmissions.length,
        onTimeSubmissions: assignmentSubmissions.filter(s => s.status === 'onTime').length,
        lateSubmissions: assignmentSubmissions.filter(s => s.status === 'late').length,
        submissionRate: students.length > 0 ? 
          ((assignmentSubmissions.length / students.length) * 100).toFixed(1) : 0
      };
    });

    // Log successful report generation with complete details
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "REPORT_GENERATE",
      resourceType: "report",
      details: JSON.stringify({
        action: "Assignment Report Generated Successfully",
        generatedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email,
          semester: currentUser.semester
        },
        reportSummary: {
          semester: semester,
          generatedAt: new Date().toISOString(),
          filters: {
            courseId: courseId || 'all',
            courseName: courseId !== 'all' ? 
              courses.find(c => c._id.toString() === courseId)?.courseName : 'All Courses'
          }
        },
        statistics: {
          totalStudents: stats.totalStudents,
          totalAssignments: stats.totalAssignments,
          totalSubmissions: stats.totalSubmissions,
          onTimeSubmissions: stats.onTimeSubmissions,
          lateSubmissions: stats.lateSubmissions,
          overallSubmissionRate: stats.submissionRate + '%'
        },
        studentSubmissionStats: studentSubmissionStats.map(s => ({
          name: s.studentName,
          collegeId: s.collegeId,
          submissions: s.totalSubmissions,
          percentage: s.submissionPercentage + '%',
          onTime: s.onTimeSubmissions,
          late: s.lateSubmissions
        })),
        assignmentSubmissionStats: assignmentSubmissionStats.map(a => ({
          title: a.assignmentTitle,
          course: a.courseName,
          submissions: a.totalSubmissions,
          submissionRate: a.submissionRate + '%',
          onTime: a.onTimeSubmissions,
          late: a.lateSubmissions
        })),
        courses: courses.map(c => ({
          name: c.courseName,
          code: c.courseCode,
          teacher: c.teacherName
        })),
        assignmentsList: assignments.map(a => ({
          title: a.title,
          course: a.course?.courseName,
          dueDate: a.submissionDate,
          chapter: a.chapter
        }))
      })
    });

    return NextResponse.json({
      success: true,
      data: reportData,
      stats: stats
    });

  } catch (error) {
    console.error('Error generating assignment report:', error);
    
    // Log error with details
    try {
      const { searchParams } = new URL(request.url);
      const semester = searchParams.get('semester');
      const courseId = searchParams.get('courseId');
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "REPORT_GENERATE",
        resourceType: "report",
        details: JSON.stringify({
          action: "Report Generation Failed",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedParams: {
            semester: semester,
            courseId: courseId
          },
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}