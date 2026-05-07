// app/api/user/profile/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'bba-is-awesome';

export async function GET() {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const userId = decoded.id;
    
    const user = await User.findById(userId)
      .select('-password -__v');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        collegeId: user.collegeId,
        role: user.role,
        status: user.status,
        semester: user.semester,
        designation: user.designation,
        session: user.session,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}