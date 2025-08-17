import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * DEV ONLY: Instant magic link login generator.
 * Usage: /api/auth/dev-login?email=user@example.com
 * Returns { token_hash, type } which the client can pass to supabase.auth.verifyOtp
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'dev-login disabled in production' }, { status: 403 })
  }
  const email = new URL(req.url).searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase service configuration' }, { status: 500 })
  }

  try {
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    // Ensure user exists (ignore conflict)
    await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => {})
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message || 'Failed to generate link' }, { status: 500 })
    }
    const action = data.properties.action_link
    console.log('[DEV-LOGIN] Generated Magic Link:', action)
    
    const linkUrl = new URL(action)
    
    // Try to extract token_hash from different possible locations
    let token_hash = linkUrl.searchParams.get('token_hash') || linkUrl.searchParams.get('token')
    let type = linkUrl.searchParams.get('type') || 'magiclink'
    
    // If not in query params, try hash fragment
    if (!token_hash && linkUrl.hash) {
      const hashParams = new URLSearchParams(linkUrl.hash.substring(1))
      token_hash = hashParams.get('token_hash') || hashParams.get('token')
      type = hashParams.get('type') || type
    }
    
    if (!token_hash) {
      // Return the link anyway for manual testing
      console.log('[DEV-LOGIN] No token_hash found, returning link for manual use')
      return NextResponse.json({ 
        success: false, 
        error: 'token_hash missing in generated link',
        action_link: action,
        suggestion: 'Use this link directly in browser or check Supabase URL configuration'
      }, { status: 500 })
    }
    
    console.log('[DEV-LOGIN] Extracted token_hash:', token_hash?.substring(0, 10) + '...')
    return NextResponse.json({ success: true, token_hash, type, action_link: action })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 })
  }
}
