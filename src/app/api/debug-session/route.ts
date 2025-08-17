import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Get all cookies from the request
    const cookies = req.headers.get('cookie') || ''
    
    // Parse cookies to find Supabase auth data
    const cookiePairs = cookies.split(';').map(c => c.trim())
    const authCookies: any = {}
    
    for (const pair of cookiePairs) {
      if (pair.includes('sb-') && pair.includes('auth-token')) {
        const [key, value] = pair.split('=')
        if (value) {
          try {
            const decoded = decodeURIComponent(value)
            const parsed = JSON.parse(decoded)
            authCookies[key] = {
              access_token: parsed.access_token ? 'present' : 'missing',
              refresh_token: parsed.refresh_token ? 'present' : 'missing',
              user: parsed.user?.email || 'no-user'
            }
          } catch (e) {
            authCookies[key] = 'parse-error'
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      cookies: {
        total: cookiePairs.length,
        supabaseAuth: authCookies,
        allCookieNames: cookiePairs.map(p => p.split('=')[0]).filter(name => name.includes('sb'))
      },
      instructions: 'This shows what auth cookies are being sent to the backend'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
