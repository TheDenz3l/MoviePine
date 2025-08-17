import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * DEV ONLY: Direct authentication without magic link
 * Generates a real Supabase session directly
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'direct-auth disabled in production' }, { status: 403 })
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
    
    // Try to create user (ignore if already exists)
    await admin.auth.admin.createUser({
      email,
      email_confirm: true
    }).catch(() => {
      // Ignore errors - user might already exist
    })

    // Generate a session for this user (works for existing or new users)
    const { data: sessionData, error: sessionError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email
    })

    if (sessionError) {
      return NextResponse.json({ error: `Session generation failed: ${sessionError.message}` }, { status: 500 })
    }

    // Return the magic link for direct use
    const actionLink = sessionData.properties.action_link
    
    return NextResponse.json({
      success: true,
      message: 'Authentication link generated',
      actionLink,
      instructions: 'Click the actionLink directly in browser to authenticate',
      email
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'unknown error' }, { status: 500 })
  }
}
