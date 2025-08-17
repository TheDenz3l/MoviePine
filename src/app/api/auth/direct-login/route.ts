import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setSessionCookies } from '@/lib/sessionUtils'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create or get user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true
    })

    if (userError && !userError.message.includes('already registered')) {
      throw userError
    }

    // Generate session directly
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    })

    if (sessionError) throw sessionError

    // Extract token from the generated link
    const url = new URL(sessionData.properties.action_link)
    const accessToken = url.searchParams.get('access_token')
    const refreshToken = url.searchParams.get('refresh_token')

    if (!accessToken) {
      throw new Error('Could not extract access token from magic link')
    }

    const response = NextResponse.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: sessionData.user
    });

    // Set session cookies
    setSessionCookies(response, { access_token: accessToken, refresh_token: refreshToken, user: sessionData.user });

    return response;

  } catch (error: any) {
    console.error('Direct login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}
