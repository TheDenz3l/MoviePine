import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    // Get cookies from the request
    const cookies = req.headers.get('cookie') || ''
    
    // Create a supabase client that can work with server-side cookies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce'
        }
      }
    )

    // Try to get session from cookies by parsing them
    let accessToken = null
    
    // Look for supabase auth cookies
    const cookiePairs = cookies.split(';').map(c => c.trim())
    for (const pair of cookiePairs) {
      if (pair.includes('sb-') && pair.includes('auth-token')) {
        const value = pair.split('=')[1]
        if (value) {
          try {
            const decoded = decodeURIComponent(value)
            const parsed = JSON.parse(decoded)
            if (parsed.access_token) {
              accessToken = parsed.access_token
              break
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No valid session found',
        message: 'Try refreshing the main page and logging in again',
        cookies: cookiePairs.filter(c => c.includes('sb')).map(c => c.split('=')[0])
      }, { status: 401 })
    }

    // Verify the token is valid
    const { data: userData, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !userData.user) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        message: 'Token found but not valid, try logging in again'
      }, { status: 401 })
    }

    return NextResponse.json({ 
      success: true,
      token: accessToken,
      user: userData.user.email,
      expires: userData.user.user_metadata?.expires_at
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      type: 'server_error'
    }, { status: 500 })
  }
}
