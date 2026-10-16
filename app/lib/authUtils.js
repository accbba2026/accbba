// app/lib/authUtils.js
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import User from '@/app/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'bba-is-awesome';

// ✅ No expiry - token lasts until sessionToken changes
// Generate JWT token WITH sessionToken embedded
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      collegeId: user.collegeId,
      email: user.email,
      role: user.role,
      name: user.name,
      sessionToken: user.sessionToken, // ✅ Embed session token
    },
    JWT_SECRET
    // ✅ No expiresIn - token never expires
  );
}

// Generate a unique session token
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify JWT token (no expiry check needed, but jwt.verify still works)
export function verifyTokenForServer(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Set auth cookie - ASYNC (no maxAge = session cookie, but we want persistent)
export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year (effectively "forever")
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