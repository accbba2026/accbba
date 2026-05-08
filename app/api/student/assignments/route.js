import { connectToDatabase } from '@/app/lib/mongodb';
import Assignment from '@/app/models/Assignment';
import Course from '@/app/models/Course'; 
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/authUtils';

export async function GET(request) {
  try {
    await connectToDatabase();
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    
    // 1. Fetch the assignments (removed .sort() from query to handle it manually)
    const assignments = await Assignment.find({ 
      semester: semester || currentUser.semester,
      status: 'published'
    }).populate('course', 'courseName courseCode');

    // 2. Custom Sorting Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedAssignments = assignments.sort((a, b) => {
      const dateA = new Date(a.submissionDate);
      const dateB = new Date(b.submissionDate);
      
      // Normalize dates to midnight for accurate day-based comparison
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);

      const diffA = dateA - today;
      const diffB = dateB - today;

      const isExpiredA = diffA < 0;
      const isExpiredB = diffB < 0;

      // If one is expired and the other isn't, keep the expired one at the bottom
      if (isExpiredA && !isExpiredB) return 1;
      if (!isExpiredA && isExpiredB) return -1;

      // If both are expired: sort by most recent first
      if (isExpiredA && isExpiredB) {
        return dateB - dateA;
      }

      // If both are upcoming: sort by nearest deadline first
      return diffA - diffB;
    });
    
    return NextResponse.json({ success: true, data: sortedAssignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}