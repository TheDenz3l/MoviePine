import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate a magic link for the user (works for existing users)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    })

    if (error) {
      throw error
    }

    // Extract the access token from the generated link
    const actionLink = data.properties.action_link
    console.log('Generated action link:', actionLink)
    
    const url = new URL(actionLink)
    
    // Try different token extraction methods
    let accessToken = url.searchParams.get('access_token')
    let refreshToken = url.searchParams.get('refresh_token')
    
    // If not in query params, check hash fragment
    if (!accessToken && url.hash) {
      const hashParams = new URLSearchParams(url.hash.substring(1))
      accessToken = hashParams.get('access_token')
      refreshToken = hashParams.get('refresh_token')
    }
    
    // If still no tokens, try to get them from the verification endpoint
    if (!accessToken) {
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type') || 'magiclink'
      
      if (tokenHash) {
        console.log('Using token_hash to verify and get session')
        
        // Use the verification endpoint to exchange token_hash for session
        const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?type=${type}&token_hash=${encodeURIComponent(tokenHash)}`
        const verifyResponse = await fetch(verifyUrl, {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
          }
        })
        
        if (verifyResponse.ok) {
          const sessionData = await verifyResponse.json()
          console.log('Verification response:', sessionData)
          
          if (sessionData.access_token) {
            accessToken = sessionData.access_token
            refreshToken = sessionData.refresh_token
          }
        }
      }
    }

    if (!accessToken) {
      throw new Error('Could not extract tokens from magic link. Link format: ' + actionLink)
    }

    // Set cookies and return success
    const response = NextResponse.json({
      success: true,
      message: `Logged in as ${email}`,
      user: data.user
    })

    response.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    if (refreshToken) {
      response.cookies.set('sb-refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
    }

    return response

  } catch (error: any) {
    console.error('Instant login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}
