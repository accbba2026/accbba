// app/api/faculty/courses/create/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Course from '@/app/models/Course';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const currentUser = await getCurrentUser();
    
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "COURSE_CREATE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Unauthorized Course Creation Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { courseName, courseCode, semester, teacherName } = await request.json();
    
    // Validate required fields
    const missingFields = [];
    if (!courseName) missingFields.push('courseName');
    if (!semester) missingFields.push('semester');
    if (!teacherName) missingFields.push('teacherName');
    
    if (missingFields.length > 0) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "COURSE_CREATE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Course Creation Failed - Missing Required Fields",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          missingFields: missingFields,
          providedData: {
            courseName: courseName || 'missing',
            courseCode: courseCode || 'not provided',
            semester: semester || 'missing',
            teacherName: teacherName || 'missing'
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    const validSemesters = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
    if (!validSemesters.includes(semester)) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "COURSE_CREATE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Course Creation Failed - Invalid Semester",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          attemptedSemester: semester,
          validSemesters: validSemesters,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Invalid semester' },
        { status: 400 }
      );
    }
    
    // Check for duplicate course code (if provided)
    if (courseCode) {
      const existingCourse = await Course.findOne({ courseCode, semester });
      if (existingCourse) {
        await Log.create({
          user: currentUser._id,
          userRole: currentUser.role,
          action: "COURSE_CREATE",
          resourceType: "course",
          details: JSON.stringify({
            action: "Course Creation Failed - Duplicate Course Code",
            user: {
              id: currentUser._id,
              name: currentUser.name,
              collegeId: currentUser.collegeId,
              role: currentUser.role
            },
            attemptedData: {
              courseName: courseName,
              courseCode: courseCode,
              semester: semester
            },
            existingCourse: {
              id: existingCourse._id,
              name: existingCourse.courseName,
              code: existingCourse.courseCode,
              semester: existingCourse.semester
            },
            timestamp: new Date().toISOString()
          })
        });
        
        return NextResponse.json(
          { success: false, message: 'Course with this code already exists in this semester' },
          { status: 409 }
        );
      }
    }
    
    // Check for duplicate course name in same semester
    const existingCourseByName = await Course.findOne({ courseName, semester });
    if (existingCourseByName) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "COURSE_CREATE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Course Creation Failed - Duplicate Course Name",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          attemptedData: {
            courseName: courseName,
            semester: semester
          },
          existingCourse: {
            id: existingCourseByName._id,
            name: existingCourseByName.courseName,
            code: existingCourseByName.courseCode,
            semester: existingCourseByName.semester
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: 'Course with this name already exists in this semester' },
        { status: 409 }
      );
    }
    
    // Log course creation attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "COURSE_CREATE",
      resourceType: "course",
      details: JSON.stringify({
        action: "Course Creation Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        courseData: {
          courseName: courseName,
          courseCode: courseCode || 'Not provided',
          semester: semester,
          teacherName: teacherName
        },
        timestamp: new Date().toISOString()
      })
    });
    
    const course = await Course.create({
      courseName,
      courseCode: courseCode || null,
      semester,
      teacherName,
    });
    
    // Log successful course creation
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "COURSE_CREATE",
      resourceType: "course",
      resourceId: course._id,
      details: JSON.stringify({
        action: "Course Created Successfully",
        createdBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        course: {
          id: course._id,
          name: course.courseName,
          code: course.courseCode,
          semester: course.semester,
          teacherName: course.teacherName,
          createdAt: course.createdAt
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({
      success: true,
      message: 'Course created successfully',
      data: course
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating course:', error);
    
    // Log error with details
    try {
      const { courseName, courseCode, semester, teacherName } = await request.json().catch(() => ({}));
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "COURSE_CREATE",
        resourceType: "course",
        details: JSON.stringify({
          action: "Course Creation Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedData: {
            courseName: courseName || 'Not provided',
            courseCode: courseCode || 'Not provided',
            semester: semester || 'Not provided',
            teacherName: teacherName || 'Not provided'
          },
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}