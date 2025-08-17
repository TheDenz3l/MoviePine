import { NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/sessionUtils';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear auth cookies using centralized utility
  clearSessionCookies(response);
  console.log('[Auth Logout API] Session cookies cleared and user logged out.');
  
  return response;
}
