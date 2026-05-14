// app/api/cr/assignments/create/route.js
import { connectToDatabase } from "@/app/lib/mongodb";
import Assignment from "@/app/models/Assignment";
import Course from "@/app/models/Course";
import Log from "@/app/models/Log";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/authUtils";

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "cr") {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_CREATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Unauthorized Assignment Creation Attempt",
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
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      chapter,
      semester,
      course,
      pdfUrl,
      pdfPublicId,
      pdfFileName,
      pdfFileSize,
      submissionDate,
      dueDate,
      instructions,
      resources,
    } = body;

    // Validate required fields
    if (!title || !description || !course || !submissionDate) {
      const missingFields = [];
      if (!title) missingFields.push('title');
      if (!description) missingFields.push('description');
      if (!course) missingFields.push('course');
      if (!submissionDate) missingFields.push('submissionDate');
      
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_CREATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Creation Failed - Missing Required Fields",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          missingFields: missingFields,
          providedData: {
            title: title || 'missing',
            description: description || 'missing',
            course: course || 'missing',
            submissionDate: submissionDate || 'missing'
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 },
      );
    }

    // Log assignment creation attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_CREATE",
      resourceType: "assignment",
      details: JSON.stringify({
        action: "Assignment Creation Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email,
          semester: currentUser.semester
        },
        assignmentData: {
          title: title,
          description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
          chapter: chapter || 'Not specified',
          course: course,
          submissionDate: submissionDate,
          dueDate: dueDate || 'Not specified',
          hasInstructions: !!instructions,
          hasResources: !!(resources && resources.length > 0),
          hasPDF: !!pdfUrl,
          pdfFileName: pdfFileName || 'Not provided',
          pdfFileSize: pdfFileSize ? `${(pdfFileSize / (1024 * 1024)).toFixed(2)} MB` : 'Not provided'
        },
        timestamp: new Date().toISOString()
      })
    });

    // Verify course belongs to CR's semester
    const courseData = await Course.findById(course);
    if (!courseData) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_CREATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Creation Failed - Course Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          courseId: course,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 },
      );
    }

    if (courseData.semester !== currentUser.semester) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_CREATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Creation Failed - Semester Mismatch",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            userSemester: currentUser.semester
          },
          course: {
            id: courseData._id,
            name: courseData.courseName,
            code: courseData.courseCode,
            courseSemester: courseData.semester
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json(
        {
          success: false,
          message: "You can only create assignments for your semester",
        },
        { status: 403 },
      );
    }

    // Prepare assignment data (only include PDF fields if they exist)
    const assignmentData = {
      title,
      description,
      chapter,
      semester: currentUser.semester,
      course,
      courseName: courseData.courseName,
      courseCode: courseData.courseCode,
      teacher: currentUser.id,
      teacherName: currentUser.name,
      submissionDate,
      dueDate,
      instructions: instructions || "",
      resources: resources || [],
      status: "published",
    };

    // Only add PDF fields if they exist
    if (pdfUrl) {
      assignmentData.pdfUrl = pdfUrl;
      assignmentData.pdfPublicId = pdfPublicId;
      assignmentData.pdfFileName = pdfFileName;
      assignmentData.pdfFileSize = pdfFileSize;
    }

    const assignment = await Assignment.create(assignmentData);

    // Log successful assignment creation with complete details
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_CREATE",
      resourceType: "assignment",
      resourceId: assignment._id,
      details: JSON.stringify({
        action: "Assignment Created Successfully",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email,
          semester: currentUser.semester
        },
        assignment: {
          id: assignment._id,
          title: assignment.title,
          description: assignment.description.substring(0, 200) + (assignment.description.length > 200 ? '...' : ''),
          chapter: assignment.chapter || 'Not specified',
          semester: assignment.semester,
          course: {
            id: courseData._id,
            name: courseData.courseName,
            code: courseData.courseCode,
            semester: courseData.semester
          },
          submissionDate: assignment.submissionDate,
          dueDate: assignment.dueDate,
          hasInstructions: !!assignment.instructions,
          instructionsLength: assignment.instructions ? assignment.instructions.length : 0,
          resourcesCount: assignment.resources ? assignment.resources.length : 0,
          resources: assignment.resources ? assignment.resources.map(r => ({
            title: r.title,
            url: r.url
          })) : [],
          pdfDetails: pdfUrl ? {
            fileName: pdfFileName,
            fileSize: `${(pdfFileSize / (1024 * 1024)).toFixed(2)} MB`,
            hasPublicId: !!pdfPublicId
          } : null,
          status: assignment.status,
          createdAt: assignment.createdAt
        },
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json(
      { success: true, data: assignment },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    
    // Log error with details
    try {
      const body = await request.json().catch(() => ({}));
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_CREATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Creation Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          attemptedData: {
            title: body.title || 'Not provided',
            description: body.description ? (body.description.substring(0, 100) + '...') : 'Not provided',
            course: body.course || 'Not provided',
            submissionDate: body.submissionDate || 'Not provided'
          },
          error: {
            name: error.name,
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
      { status: 500 },
    );
  }
}