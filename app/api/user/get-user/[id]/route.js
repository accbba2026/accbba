// app/api/user/get-user/[id]/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    
    console.log("API - Fetching user with ID:", id);
    console.log("ID type:", typeof id);
    console.log("ID length:", id?.length);
    
    // Don't validate ObjectId format - let MongoDB handle it
    // Just try to find by _id directly
    let user = null;
    
    try {
      // First try to find by _id
      user = await User.findById(id).select('-password -__v').lean();
    } catch (err) {
      console.log("FindById failed, trying alternative methods...");
    }
    
    // If not found by _id, try by collegeId
    if (!user) {
      user = await User.findOne({ collegeId: id }).select('-password -__v').lean();
    }
    
    // If still not found, try by email
    if (!user) {
      user = await User.findOne({ email: id }).select('-password -__v').lean();
    }
    
    if (!user) {
      console.log("API - User not found for ID:", id);
      return NextResponse.json(
        { 
          success: false, 
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }
    
    console.log("API - User found:", {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
    // Return user data with timestamps
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
        session: user.session,
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null
      }
    });
    
  } catch (error) {
    console.error('API - Error fetching user:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      },
      { status: 500 }
    );
  }
}