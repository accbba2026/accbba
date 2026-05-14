// app/api/cr/assignments/update/route.js

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
    
    if (!currentUser || currentUser.role !== 'cr') {
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
            collegeId: currentUser.collegeId
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Assignment ID is required' }, { status: 400 });
    }
    
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
          email: currentUser.email,
          semester: currentUser.semester
        },
        updateData: {
          title: updateData.title || 'Not changing',
          description: updateData.description ? (updateData.description.substring(0, 200) + (updateData.description.length > 200 ? '...' : '')) : 'Not changing',
          chapter: updateData.chapter || 'Not changing',
          course: updateData.course || 'Not changing',
          submissionDate: updateData.submissionDate || 'Not changing',
          dueDate: updateData.dueDate || 'Not changing',
          hasInstructions: 'instructions' in updateData,
          hasResources: 'resources' in updateData,
          isPDFUpdated: !!updateData.pdfUrl,
          pdfFileName: updateData.pdfFileName || 'Not provided'
        },
        timestamp: new Date().toISOString()
      })
    });
    
    const assignment = await Assignment.findById(id);
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
            collegeId: currentUser.collegeId
          },
          assignmentId: id,
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Store original assignment data for comparison
    const originalAssignment = {
      title: assignment.title,
      description: assignment.description,
      chapter: assignment.chapter,
      course: assignment.course,
      courseName: assignment.courseName,
      courseCode: assignment.courseCode,
      submissionDate: assignment.submissionDate,
      dueDate: assignment.dueDate,
      instructions: assignment.instructions,
      resources: assignment.resources,
      pdfUrl: assignment.pdfUrl,
      pdfFileName: assignment.pdfFileName,
      status: assignment.status
    };
    
    // Verify assignment belongs to CR's semester
    if (assignment.semester !== currentUser.semester) {
      await Log.create({
        user: currentUser._id,
        userRole: currentUser.role,
        action: "ASSIGNMENT_UPDATE",
        resourceType: "assignment",
        resourceId: id,
        details: JSON.stringify({
          action: "Assignment Update Failed - Semester Mismatch",
          user: {
            id: currentUser._id,
            name: currentUser.name,
            collegeId: currentUser.collegeId,
            userSemester: currentUser.semester
          },
          assignment: {
            id: assignment._id,
            title: assignment.title,
            assignmentSemester: assignment.semester
          },
          timestamp: new Date().toISOString()
        })
      });
      
      return NextResponse.json({ success: false, message: 'You can only edit assignments from your semester' }, { status: 403 });
    }
    
    // Track what fields are being updated
    const updatedFields = [];
    if (updateData.title && updateData.title !== originalAssignment.title) updatedFields.push('title');
    if (updateData.description && updateData.description !== originalAssignment.description) updatedFields.push('description');
    if (updateData.chapter && updateData.chapter !== originalAssignment.chapter) updatedFields.push('chapter');
    if (updateData.course && updateData.course !== originalAssignment.course.toString()) updatedFields.push('course');
    if (updateData.submissionDate && updateData.submissionDate !== originalAssignment.submissionDate?.toISOString?.()?.split('T')[0]) updatedFields.push('submissionDate');
    if (updateData.dueDate && updateData.dueDate !== originalAssignment.dueDate?.toISOString?.()?.split('T')[0]) updatedFields.push('dueDate');
    if ('instructions' in updateData && updateData.instructions !== originalAssignment.instructions) updatedFields.push('instructions');
    if ('resources' in updateData && JSON.stringify(updateData.resources) !== JSON.stringify(originalAssignment.resources)) updatedFields.push('resources');
    if (updateData.pdfUrl && updateData.pdfUrl !== originalAssignment.pdfUrl) updatedFields.push('pdfFile');
    
    if (updateData.course) {
      const courseData = await Course.findById(updateData.course);
      if (courseData) {
        updateData.courseName = courseData.courseName;
        updateData.courseCode = courseData.courseCode;
        
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
              id: courseData._id,
              name: courseData.courseName,
              code: courseData.courseCode
            }
          })
        });
      }
    }
    
    // Ensure resources is properly handled (prevent undefined)
    if (updateData.resources === undefined) {
      updateData.resources = [];
    }
    
    // If PDF file is not being updated, keep existing PDF data
    // (Don't override with undefined values)
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
          oldPDF: originalAssignment.pdfFileName ? {
            fileName: originalAssignment.pdfFileName,
            url: originalAssignment.pdfUrl
          } : null,
          newPDF: {
            fileName: updateData.pdfFileName,
            fileSize: updateData.pdfFileSize ? `${(updateData.pdfFileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
            url: updateData.pdfUrl
          }
        })
      });
    }
    
    const updatedAssignment = await Assignment.findByIdAndUpdate(id, updateData, { new: true });
    
    // Calculate changes summary
    const changes = [];
    if (updatedFields.includes('title')) changes.push(`Title: "${originalAssignment.title}" → "${updatedAssignment.title}"`);
    if (updatedFields.includes('description')) changes.push(`Description updated`);
    if (updatedFields.includes('chapter')) changes.push(`Chapter: "${originalAssignment.chapter || 'None'}" → "${updatedAssignment.chapter || 'None'}"`);
    if (updatedFields.includes('submissionDate')) changes.push(`Submission Date: ${originalAssignment.submissionDate?.toISOString?.()?.split('T')[0] || 'None'} → ${updatedAssignment.submissionDate?.toISOString?.()?.split('T')[0]}`);
    if (updatedFields.includes('dueDate')) changes.push(`Due Date: ${originalAssignment.dueDate?.toISOString?.()?.split('T')[0] || 'None'} → ${updatedAssignment.dueDate?.toISOString?.()?.split('T')[0]}`);
    if (updatedFields.includes('instructions')) changes.push(`Instructions ${originalAssignment.instructions ? 'updated' : 'added'}`);
    if (updatedFields.includes('resources')) changes.push(`Resources updated (${originalAssignment.resources?.length || 0} → ${updatedAssignment.resources?.length || 0} items)`);
    if (updatedFields.includes('pdfFile')) changes.push(`PDF file replaced`);
    
    // Log successful update
    await Log.create({
      user: currentUser._id,
      userRole: currentUser.role,
      action: "ASSIGNMENT_UPDATE",
      resourceType: "assignment",
      resourceId: id,
      details: JSON.stringify({
        action: "Assignment Updated Successfully",
        user: {
          id: currentUser._id,
          name: currentUser.name,
          collegeId: currentUser.collegeId,
          role: currentUser.role,
          email: currentUser.email,
          semester: currentUser.semester
        },
        assignment: {
          id: updatedAssignment._id,
          title: updatedAssignment.title,
          description: updatedAssignment.description.substring(0, 200) + (updatedAssignment.description.length > 200 ? '...' : ''),
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