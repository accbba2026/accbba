// app/api/user/update-profile/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const { id, name, phone, email } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Validate phone if provided
    if (phone && phone.trim()) {
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(phone)) {
        return NextResponse.json(
          { success: false, message: 'Phone number must be a valid Bangladeshi number' },
          { status: 400 }
        );
      }
    }
    
    // Validate email if provided
    if (email && email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        return NextResponse.json(
          { success: false, message: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
      
      // Check if email is taken by another user
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: id } 
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Email already exists for another user' },
          { status: 409 }
        );
      }
    }
    
    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim().toLowerCase() || null;
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}