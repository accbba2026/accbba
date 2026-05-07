// app/api/auth/verify-otp/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { verifyOTP, isVerified, clearVerification, getOTPStoreInfo } from '@/app/lib/otpService';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { identifier, otp, newPassword, loginType } = await request.json();
    
    console.log('🔐 Verify OTP request:', { 
      identifier, 
      otp: otp ? '***' : undefined, 
      hasNewPassword: !!newPassword, 
      loginType 
    });
    
    // Log current store state before verification
    const storeInfo = getOTPStoreInfo();
    console.log('📊 OTP Store before operation:', storeInfo);
    
    // If we have newPassword, this is the reset step - just verify the OTP was already validated
    if (newPassword) {
      console.log('📝 Reset password step - checking if OTP was verified...');
      
      // Check if OTP was already verified in the first step
      if (!isVerified(identifier)) {
        console.log('❌ OTP not verified. Please verify OTP first.');
        return NextResponse.json(
          { success: false, message: 'OTP not verified. Please verify your OTP first.' },
          { status: 400 }
        );
      }
      
      console.log('✅ OTP verification confirmed for reset');
      
      // Find user by identifier
      let user = null;
      if (loginType === 'cr') {
        user = await User.findOne({ collegeId: identifier, role: 'cr' });
      } else {
        user = await User.findOne({ email: identifier.toLowerCase(), role: { $in: ['admin', 'faculty'] } });
      }
      
      if (!user) {
        console.log('❌ User not found for identifier:', identifier);
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      
      console.log(`✅ User found: ${user.name}`);
      
      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
      console.log('✅ Password updated successfully');
      
      // Clear verification and OTP after successful reset
      clearVerification(identifier);
      
      return NextResponse.json({
        success: true,
        message: 'Password reset successful'
      });
    }
    
    // Otherwise, this is the verification step (no newPassword)
    console.log('🔑 Verification step - validating OTP...');
    const verification = verifyOTP(identifier, otp);
    
    if (!verification.valid) {
      console.log('❌ OTP verification failed:', verification.message);
      return NextResponse.json(
        { success: false, message: verification.message },
        { status: 400 }
      );
    }
    
    console.log('✅ OTP verified successfully. Ready for password reset.');
    
    // Return success - OTP is now marked as verified
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    });
    
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}