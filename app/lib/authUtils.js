// app/lib/authUtils.js - This remains for API routes (Node.js runtime)
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import User from '@/app/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'bba-is-awesome';
const JWT_EXPIRES_IN = '7d';

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user._id.toString(), 
      collegeId: user.collegeId, 
      email: user.email,
      role: user.role,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token (for route handlers)
export function verifyTokenForServer(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Set auth cookie - ASYNC
export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

// Clear auth cookie - ASYNC
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

// Get current user from token (for route handlers)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  
  const decoded = verifyTokenForServer(token);
  if (!decoded) return null;
  
  const user = await User.findById(decoded.id).select('-password');
  return user;
}

// Check role access
export function hasRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}