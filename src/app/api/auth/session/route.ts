import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSessionServer } from '@/lib/sessionUtils';

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth Session API] GET request received');
    
    const sessionData = await getSessionServer(request);

    if (sessionData.error) {
      console.log('[Auth Session API] Session error:', sessionData.error);
      return NextResponse.json({
        session: null,
        error: sessionData.error
      }, { status: 401 });
    }

    if (!sessionData.session) {
      console.log('[Auth Session API] No active session found');
      return NextResponse.json({ session: null }, { status: 200 });
    }

    console.log('[Auth Session API] Active session found for user:', sessionData.user?.email);
    return NextResponse.json({
      session: sessionData.session,
      user: sessionData.user
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Auth Session API] Unexpected error:', error);
    return NextResponse.json({
      session: null,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
