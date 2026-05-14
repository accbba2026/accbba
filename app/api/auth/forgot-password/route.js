// app/api/auth/forgot-password/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import { generateAndStoreOTP, getOTPStoreInfo } from '@/app/lib/otpService';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "accbba2026@gmail.com",
    pass: "fpbvhdtnwixrgvtm",
  },
});

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const { email, collegeId, loginType } = await request.json();

    
    let user = null;
    let identifier = null;
    
    if (loginType === 'cr') {
      user = await User.findOne({ collegeId: collegeId, role: 'cr' });
      identifier = collegeId;
    } else {
      user = await User.findOne({ email: email.toLowerCase(), role: { $in: ['admin', 'faculty'] } });
      identifier = email.toLowerCase();
    }
    
    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json(
        { success: false, message: 'No account found with this information' },
        { status: 404 }
      );
    }
    
    // Generate OTP
    const otp = generateAndStoreOTP(identifier);
    
    // Log current store state
    const storeInfo = getOTPStoreInfo();
    console.log('📊 OTP Store after generation:', storeInfo);
    
    // Send OTP via email
    await transporter.sendMail({
      from: "accbba2026@gmail.com",
      to: user.email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2563eb;">Department of BBA</h2>
            <h3 style="color: #4b5563;">Adamjee Cantonment College</h3>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1f2937; margin-top: 0;">Password Reset Request</h3>
            <p style="color: #4b5563;">Dear <strong>${user.name}</strong>,</p>
            <p style="color: #4b5563;">You requested to reset your password. Use the OTP below to verify your identity:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otp}</p>
            </div>
            
            <p style="color: #4b5563;">This OTP is valid for <strong>5 minutes</strong>.</p>
            <p style="color: #ef4444; font-size: 14px;"><strong>⚠️ Security Note:</strong> Never share this OTP with anyone.</p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #9ca3af; font-size: 12px;">
            <p>If you didn't request this, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} Department of BBA, Adamjee Cantonment College</p>
          </div>
        </div>
      `,
    });
    
    
    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      identifier: identifier
    });
    
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}