// app/api/faculty/assignments/update/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import Course from '@/app/models/Course';
import Log from '@/app/models/Log';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function PUT(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    // Faculty or Admin can update assignments
    if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'admin')) {
      // Log unauthorized attempt
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Unauthorized Assignment Update Attempt",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { id, ...updateData } = await request.json();
    
    if (!id) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        details: JSON.stringify({
          action: "Assignment Update Failed - Missing ID",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Assignment ID is required' }, { status: 400 });
    }
    
    // Get original assignment before update
    const assignment = await Assignment.findById(id)
      .populate('course', 'courseName courseCode');
    
    if (!assignment) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        resourceId: id,
        details: JSON.stringify({
          action: "Assignment Update Failed - Assignment Not Found",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          },
          assignmentId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Store original data for comparison
    const originalData = {
      title: assignment.title,
      description: assignment.description,
      chapter: assignment.chapter,
      semester: assignment.semester,
      course: assignment.course?._id || assignment.course,
      courseName: assignment.courseName,
      courseCode: assignment.courseCode,
      submissionDate: assignment.submissionDate,
      dueDate: assignment.dueDate,
      instructions: assignment.instructions,
      resources: assignment.resources,
      pdfUrl: assignment.pdfUrl,
      pdfFileName: assignment.pdfFileName
    };
    
    // Log update attempt
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_UPDATE",
      resourceType: "assignment",
      resourceId: id,
      details: JSON.stringify({
        action: "Assignment Update Attempt",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        assignment: {
          id: assignment._id,
          title: assignment.title,
          courseName: assignment.courseName
        },
        updateData: {
          title: updateData.title || 'Not changing',
          description: updateData.description ? (updateData.description.substring(0, 100) + '...') : 'Not changing',
          chapter: updateData.chapter || 'Not changing',
          course: updateData.course || 'Not changing',
          submissionDate: updateData.submissionDate || 'Not changing',
          dueDate: updateData.dueDate || 'Not changing',
          hasInstructions: 'instructions' in updateData,
          hasResources: 'resources' in updateData,
          isPDFUpdated: !!updateData.pdfUrl
        },
        timestamp: new Date().toISOString()
      })
    });
    
    // Track what fields are being updated
    const updatedFields = [];
    const changes = [];
    
    if (updateData.title && updateData.title !== originalData.title) {
      updatedFields.push('title');
      changes.push(`Title: "${originalData.title}" → "${updateData.title}"`);
    }
    if (updateData.description && updateData.description !== originalData.description) {
      updatedFields.push('description');
      changes.push(`Description updated`);
    }
    if (updateData.chapter && updateData.chapter !== originalData.chapter) {
      updatedFields.push('chapter');
      changes.push(`Chapter: "${originalData.chapter || 'None'}" → "${updateData.chapter}"`);
    }
    if (updateData.course && updateData.course !== originalData.course?.toString()) {
      updatedFields.push('course');
    }
    if (updateData.submissionDate && updateData.submissionDate !== originalData.submissionDate?.toISOString?.()?.split('T')[0]) {
      updatedFields.push('submissionDate');
      changes.push(`Submission Date: ${originalData.submissionDate?.toISOString?.()?.split('T')[0] || 'None'} → ${updateData.submissionDate}`);
    }
    if (updateData.dueDate && updateData.dueDate !== originalData.dueDate?.toISOString?.()?.split('T')[0]) {
      updatedFields.push('dueDate');
      changes.push(`Due Date: ${originalData.dueDate?.toISOString?.()?.split('T')[0] || 'None'} → ${updateData.dueDate}`);
    }
    if ('instructions' in updateData && updateData.instructions !== originalData.instructions) {
      updatedFields.push('instructions');
      changes.push(`Instructions ${originalData.instructions ? 'updated' : 'added'}`);
    }
    if ('resources' in updateData && JSON.stringify(updateData.resources) !== JSON.stringify(originalData.resources)) {
      updatedFields.push('resources');
      changes.push(`Resources updated (${originalData.resources?.length || 0} → ${updateData.resources?.length || 0} items)`);
    }
    if (updateData.pdfUrl && updateData.pdfUrl !== originalData.pdfUrl) {
      updatedFields.push('pdfFile');
      changes.push(`PDF file replaced: "${originalData.pdfFileName || 'None'}" → "${updateData.pdfFileName}"`);
    }
    
    // If course is being updated, fetch the course details
    let newCourseData = null;
    if (updateData.course && updateData.course !== originalData.course?.toString()) {
      newCourseData = await Course.findById(updateData.course);
      if (newCourseData) {
        updateData.courseName = newCourseData.courseName;
        updateData.courseCode = newCourseData.courseCode;
        changes.push(`Course: "${originalData.courseName}" → "${newCourseData.courseName}"`);
      }
      
      // Log course change separately
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        resourceId: id,
        details: JSON.stringify({
          action: "Course Changed",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          assignment: {
            id: assignment._id,
            title: assignment.title
          },
          oldCourse: {
            id: assignment.course,
            name: assignment.courseName,
            code: assignment.courseCode
          },
          newCourse: {
            id: newCourseData?._id,
            name: newCourseData?.courseName,
            code: newCourseData?.courseCode
          }
        })
      });
    }
    
    // Ensure resources is properly handled (prevent undefined)
    if (updateData.resources === undefined) {
      updateData.resources = [];
    }
    
    // If PDF file is not being updated, keep existing PDF data
    if (updateData.pdfUrl === undefined) {
      delete updateData.pdfUrl;
      delete updateData.pdfPublicId;
      delete updateData.pdfFileName;
      delete updateData.pdfFileSize;
    } else {
      // Log PDF update
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        resourceId: id,
        details: JSON.stringify({
          action: "PDF File Updated",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId
          },
          assignment: {
            id: assignment._id,
            title: assignment.title
          },
          oldPDF: originalData.pdfFileName ? {
            fileName: originalData.pdfFileName,
            url: originalData.pdfUrl
          } : null,
          newPDF: {
            fileName: updateData.pdfFileName,
            fileSize: updateData.pdfFileSize ? `${(updateData.pdfFileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'
          }
        })
      });
    }
    
    // Remove teacher field if present to prevent unauthorized teacher changes
    if (updateData.teacher) {
      delete updateData.teacher;
    }
    
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    // Log successful update
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_UPDATE",
      resourceType: "assignment",
      resourceId: id,
      details: JSON.stringify({
        action: "Assignment Updated Successfully",
        updatedBy: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email
        },
        assignment: {
          id: updatedAssignment._id,
          title: updatedAssignment.title,
          description: updatedAssignment.description?.substring(0, 200) + (updatedAssignment.description?.length > 200 ? '...' : ''),
          chapter: updatedAssignment.chapter,
          semester: updatedAssignment.semester,
          course: {
            id: updatedAssignment.course,
            name: updatedAssignment.courseName,
            code: updatedAssignment.courseCode
          },
          submissionDate: updatedAssignment.submissionDate,
          dueDate: updatedAssignment.dueDate,
          hasInstructions: !!updatedAssignment.instructions,
          resourcesCount: updatedAssignment.resources?.length || 0,
          hasPDF: !!updatedAssignment.pdfUrl,
          pdfFileName: updatedAssignment.pdfFileName,
          status: updatedAssignment.status
        },
        updateSummary: {
          fieldsUpdated: updatedFields,
          changesCount: updatedFields.length,
          changes: changes
        },
        timestamp: new Date().toISOString()
      })
    });
    
    return NextResponse.json({ success: true, data: updatedAssignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    
    // Log error with details
    try {
      const { id } = await request.json().catch(() => ({}));
      const assignment = id ? await Assignment.findById(id).catch(() => null) : null;
      
      await Log.create({
        user: currentUser?._id || null,
        userRole: currentUser?.role || 'unknown',
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        resourceId: id,
        details: JSON.stringify({
          action: "Assignment Update Failed - System Error",
          user: currentUser ? {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            role: currentUser.role
          } : null,
          assignment: assignment ? {
            id: assignment._id,
            title: assignment.title
          } : { id: id, title: 'Unknown' },
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
    
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}