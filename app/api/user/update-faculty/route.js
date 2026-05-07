// app/api/user/update-faculty/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/app/lib/passwordUtils';
import { sendFacultyPasswordUpdateEmail } from '@/app/lib/emailService';

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { id, name, phone, designation, password } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Faculty ID is required' },
        { status: 400 }
      );
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (designation !== undefined) updateData.designation = designation?.trim() || null;
    
    let passwordChanged = false;
    let plainPassword = null;
    
    if (password && password.trim()) {
      plainPassword = password;
      updateData.password = await hashPassword(password);
      passwordChanged = true;
    }
    
    const updatedFaculty = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedFaculty) {
      return NextResponse.json(
        { success: false, message: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    if (passwordChanged && updatedFaculty.email) {
      await sendFacultyPasswordUpdateEmail(updatedFaculty.email, updatedFaculty.name, plainPassword);
    }
    
    return NextResponse.json({
      success: true,
      message: passwordChanged 
        ? 'Faculty updated! New password has been sent to their email.'
        : 'Faculty updated successfully',
      data: updatedFaculty
    });
    
  } catch (error) {
    console.error('Error updating faculty:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}