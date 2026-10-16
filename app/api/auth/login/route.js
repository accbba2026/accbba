// app/api/auth/login/route.js
import { connectToDatabase } from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import {
  generateToken,
  setAuthCookie,
  generateSessionToken,
} from '@/app/lib/authUtils';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { loginType, collegeId, password, email } = body;

    let user = null;

    // Student Login - Only College ID
    if (loginType === 'student') {
      if (!collegeId) {
        return NextResponse.json(
          { success: false, message: 'College ID is required' },
          { status: 400 }
        );
      }

      user = await User.findOne({
        collegeId: collegeId,
        role: { $in: ['student'] },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid College ID' },
          { status: 401 }
        );
      }
    }

    // CR Login - College ID + Password
    else if (loginType === 'cr') {
      if (!collegeId || !password) {
        return NextResponse.json(
          { success: false, message: 'College ID and password are required' },
          { status: 400 }
        );
      }

      user = await User.findOne({
        collegeId: collegeId,
        role: 'cr',
      }).select('+password');

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid College ID or password' },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Invalid College ID or password' },
          { status: 401 }
        );
      }
    }

    // Admin/Faculty Login - Email + Password
    else if (loginType === 'admin') {
      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: 'Email and password are required' },
          { status: 400 }
        );
      }

      user = await User.findOne({
        email: email.toLowerCase(),
        role: { $in: ['admin', 'faculty'] },
      }).select('+password');

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Invalid email or password' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid login type' },
        { status: 400 }
      );
    }

    // ✅ Check if account is active
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // ✅ Generate NEW session token (invalidates all other devices)
    user.sessionToken = generateSessionToken();
    user.lastLogin = new Date();
    await user.save();

    // ✅ Generate JWT with the new sessionToken embedded
    const token = generateToken(user);
    await setAuthCookie(token);

    // Return user info (excluding sensitive data)
    const userData = {
      id: user._id,
      name: user.name,
      collegeId: user.collegeId,
      semester: user.semester || null,
      session: user.session || null,
      email: user.email,
      role: user.role,
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userData,
      redirect: getRedirectPath(user.role),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getRedirectPath(role) {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'cr':
      return '/cr/dashboard';
    default:
      return '/';
  }
}