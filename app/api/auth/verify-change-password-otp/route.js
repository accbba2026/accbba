// app/api/auth/verify-change-password-otp/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { verifyOTP, isVerified, clearVerification } from '@/app/lib/otpService';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { identifier, otp, newPassword, loginType } = await request.json();
    
    // If we have newPassword, this is the reset step
    if (newPassword) {
      if (!isVerified(identifier)) {
        return NextResponse.json(
          { success: false, message: 'Verification required. Please verify your code first.' },
          { status: 400 }
        );
      }
      
      // Find user
      let user = null;
      if (loginType === 'cr') {
        user = await User.findOne({ collegeId: identifier, role: 'cr' });
      } else {
        user = await User.findOne({ email: identifier.toLowerCase() });
      }
      
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
      
      // Clear verification
      clearVerification(identifier);
      
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      });
    }
    
    // Otherwise, this is the verification step
    const verification = verifyOTP(identifier, otp);
    
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, message: verification.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verification code verified successfully'
    });
    
  } catch (error) {
    console.error('❌ Verify change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}