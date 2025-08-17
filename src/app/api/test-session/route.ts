import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { session } = await req.json()
    
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No session provided' }, { status: 400 })
    }

    // Verify the token is valid
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: userData, error } = await supabase.auth.getUser(session.access_token)
    
    if (error || !userData.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Test the continue watching API with this token
    const continueResponse = await fetch(`${req.nextUrl.origin}/api/continue-watching`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    const continueData = await continueResponse.json()

    return NextResponse.json({
      success: true,
      token: session.access_token,
      user: userData.user.email,
      continueWatchingTest: {
        status: continueResponse.status,
        data: continueData
      }
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
