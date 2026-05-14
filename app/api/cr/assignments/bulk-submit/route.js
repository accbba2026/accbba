// app/api/cr/assignments/bulk-submit/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import AssignmentSubmission from '@/app/models/AssignmentSubmission';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function POST(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'cr') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { assignmentId, studentIds, submissionDate } = await request.json();
    
    if (!assignmentId) {
      return NextResponse.json({ success: false, message: 'Assignment ID is required' }, { status: 400 });
    }
    
    if (!studentIds || studentIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Please select at least one student' }, { status: 400 });
    }
    
    if (!submissionDate) {
      return NextResponse.json({ success: false, message: 'Submission date is required' }, { status: 400 });
    }
    
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }
    
    // Verify assignment belongs to CR's semester
    if (assignment.semester !== currentUser.semester) {
      return NextResponse.json({ 
        success: false, 
        message: 'You can only submit for assignments from your semester' 
      }, { status: 403 });
    }
    
    // Get student details - include both students and CR
    const students = await User.find({ 
      _id: { $in: studentIds },
      $or: [
        { role: 'student' },
        { role: 'cr' },
        { role: 'cr', _id: currentUser._id }
      ],
      semester: currentUser.semester
    });
    
    if (students.length === 0) {
      return NextResponse.json({ success: false, message: 'No valid students found' }, { status: 404 });
    }
    
    const submissionDateTime = new Date(submissionDate);
    const isLate = assignment.dueDate && submissionDateTime > new Date(assignment.dueDate);
    
    let submittedCount = 0;
    const errors = [];
    
    for (const student of students) {
      try {
        // Check if already submitted
        const existingSubmission = await AssignmentSubmission.findOne({
          assignment: assignmentId,
          student: student._id
        });
        
        if (existingSubmission) {
          errors.push(`${student.name} (${student.collegeId}) - Already submitted`);
          continue;
        }
        
        // Create submission with custom submission date
        await AssignmentSubmission.create({
          assignment: assignmentId,
          student: student._id,
          studentName: student.name,
          studentCollegeId: student.collegeId,
          submittedAt: submissionDateTime,
          status: isLate ? 'late' : 'onTime',
        });
        
        submittedCount++;
      } catch (error) {
        errors.push(`${student.name} (${student.collegeId}) - ${error.message}`);
      }
    }
    
    // Update assignment submission count
    await Assignment.findByIdAndUpdate(assignmentId, {
      $inc: { totalSubmissions: submittedCount }
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully submitted for ${submittedCount} student(s)`,
      submittedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error in bulk submission:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to submit assignments' 
    }, { status: 500 });
  }
}