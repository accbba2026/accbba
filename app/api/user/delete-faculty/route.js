// app/api/user/delete-faculty/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    await connectToDatabase();
    
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Faculty ID is required' },
        { status: 400 }
      );
    }
    
    const deletedFaculty = await User.findByIdAndDelete(id);
    
    if (!deletedFaculty) {
      return NextResponse.json(
        { success: false, message: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Faculty member deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting faculty:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}