import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * DEV ONLY: Test session creation that returns actual JWT tokens
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'test-session disabled in production' }, { status: 403 })
  }

  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Missing Supabase service configuration' }, { status: 500 })
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    
    // Create or get user
    let userId = null
    
    try {
      const { data: userData, error: userError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true
      })
      
      if (userData?.user?.id) {
        userId = userData.user.id
      }
    } catch (e) {
      // User might already exist
    }

    if (!userId) {
      // Try to find existing user
      try {
        const { data: listData } = await admin.auth.admin.listUsers()
        const existingUser = listData.users.find(u => u.email === email)
        if (existingUser) {
          userId = existingUser.id
        }
      } catch (e) {
        console.error('Failed to list users:', e)
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to create or find user' }, { status: 500 })
    }

    // Generate a session token for this user
    const { data: sessionData, error: sessionError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email
    })

    if (sessionError) {
      return NextResponse.json({ error: `Session generation failed: ${sessionError.message}` }, { status: 500 })
    }

    // Also try to create a proper JWT token using admin.generateAccessToken if available
    try {
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({
          email,
          password: 'temp-password-for-dev'
        })
      })

      if (response.ok) {
        const tokenData = await response.json()
        return NextResponse.json({
          success: true,
          message: 'Test session created',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          user: tokenData.user,
          magicLink: sessionData.properties.action_link,
          email
        })
      }
    } catch (e) {
      // Fallback to magic link only
    }
    
    return NextResponse.json({
      success: true,
      message: 'Magic link generated (use browser to get tokens)',
      magicLink: sessionData.properties.action_link,
      instructions: 'Open magicLink in browser, then extract tokens from cookies/localStorage',
      email
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'unknown error' }, { status: 500 })
  }
}
