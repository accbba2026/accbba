// app/api/user/get-students/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Only return students and CRs (exclude faculty, admin, and any other role)
    const allowedRoles = ['student', 'cr'];

    let query = {
      role: { $in: allowedRoles },
      // Safety net: still require a collegeId so we never leak non-student accounts
      collegeId: { $exists: true, $nin: [null, ''] },
    };

    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { collegeId: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(query)
      .select('-password -__v -sessionToken') // never send sensitive fields
      .sort({ semester: 1, name: 1 });

    return NextResponse.json({
      success: true,
      data: students,
      count: students.length,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}