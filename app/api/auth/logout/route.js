// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/app/lib/authUtils';

export async function POST() {
  await clearAuthCookie(); // Added 'await' here
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}