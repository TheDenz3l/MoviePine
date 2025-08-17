import { NextResponse } from 'next/server';
import { getSessionServer } from '@/lib/sessionUtils';

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionServer(request);

    if (!session) {
      console.log('[Auth Session API] No active session found.');
      return NextResponse.json({ session: null }, { status: 200 });
    }

    console.log('[Auth Session API] Active session found for user:', session.user?.id);
    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('[Auth Session API] Error fetching session:', error.message);
    return NextResponse.json({ session: null, error: error.message }, { status: 500 });
  }
}
